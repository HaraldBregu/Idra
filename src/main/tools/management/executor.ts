import { InMemoryToolAuditLog, redactSensitive, summarizeOutput, type ToolAuditLog } from './audit-log';
import { validateJsonSchema } from './schema';
import { TOOL_SAFETY_ORDER, createToolResult, type Tool, type ToolExecutionContext, type ToolResult } from './types';
import { ToolOutputValidator } from './output-validator';

export interface ToolExecutorOptions {
	defaultTimeoutMs?: number;
	maxRetries?: number;
	backoffMs?: number;
	maxToolCallsPerTurn?: number;
	auditLog?: ToolAuditLog;
	outputValidator?: ToolOutputValidator;
	sleep?: (ms: number) => Promise<void>;
}

export class ToolTransientError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ToolTransientError';
	}
}

export class ToolExecutor {
	private readonly rateLimitBuckets = new Map<string, number[]>();
	private readonly turnCallCounts = new Map<string, number>();
	private readonly defaultTimeoutMs: number;
	private readonly maxRetries: number;
	private readonly backoffMs: number;
	private readonly maxToolCallsPerTurn: number;
	private readonly auditLog: ToolAuditLog;
	private readonly outputValidator: ToolOutputValidator;
	private readonly sleep: (ms: number) => Promise<void>;

	constructor(options: ToolExecutorOptions = {}) {
		this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
		this.maxRetries = options.maxRetries ?? 2;
		this.backoffMs = options.backoffMs ?? 100;
		this.maxToolCallsPerTurn = options.maxToolCallsPerTurn ?? 8;
		this.auditLog = options.auditLog ?? new InMemoryToolAuditLog();
		this.outputValidator = options.outputValidator ?? new ToolOutputValidator();
		this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
	}

	async execute<TInput, TOutput>(
		tool: Tool<TInput, TOutput>,
		input: TInput,
		context: ToolExecutionContext
	): Promise<ToolResult<TOutput>> {
		const startedAt = new Date();
		const preflight = await this.preflight(tool, input, context, startedAt);
		if (preflight) {
			await this.audit(tool, input, context, preflight);
			return preflight;
		}

		let retryCount = 0;
		let lastResult: ToolResult<TOutput> | undefined;
		while (retryCount <= this.maxRetries) {
			try {
				const result = await this.withTimeout(tool.execute(input, context), this.defaultTimeoutMs, tool.id, retryCount, startedAt);
				lastResult = this.finalizeResult(tool, result, startedAt, retryCount);
				if (!shouldRetry(lastResult) || retryCount >= this.maxRetries) break;
			} catch (error) {
				lastResult = this.errorResult(tool.id, startedAt, retryCount, error);
				if (!shouldRetry(lastResult) || retryCount >= this.maxRetries) break;
			}
			retryCount++;
			await this.sleep(this.backoffMs * retryCount);
		}

		const finished = lastResult ?? this.errorResult(tool.id, startedAt, retryCount, new Error('tool did not return a result'));
		if (finished.success) {
			const output = this.outputValidator.validate(finished, tool.outputSchema, tool.metadata.maxAgeMs);
			if (output.status === 'invalid') {
				const invalid = createToolResult<TOutput>({
					toolId: tool.id,
					success: false,
					error: {
						code: 'OUTPUT_SCHEMA_INVALID',
						message: output.warnings.join('; ') || 'tool output failed schema validation',
						retryable: false,
						category: 'validation',
					},
					warnings: output.warnings,
					startedAt,
					finishedAt: new Date(),
					retryCount: finished.retryCount,
					metadata: finished.metadata,
				});
				await this.audit(tool, input, context, invalid);
				return invalid;
			}
			finished.warnings.push(...output.warnings.filter((warning) => !finished.warnings.includes(warning)));
			finished.metadata = { ...finished.metadata, provenance: output.provenance, outputStatus: output.status };
		}
		await this.audit(tool, input, context, finished);
		return finished;
	}

	private async preflight<TInput, TOutput>(
		tool: Tool<TInput, TOutput>,
		input: TInput,
		context: ToolExecutionContext,
		startedAt: Date
	): Promise<ToolResult<TOutput> | undefined> {
		const validation = validateJsonSchema(input, tool.inputSchema);
		if (!validation.valid) {
			return createToolResult<TOutput>({
				toolId: tool.id,
				success: false,
				error: { code: 'INPUT_SCHEMA_INVALID', message: validation.errors.join('; '), retryable: false, category: 'validation' },
				startedAt,
				finishedAt: new Date(),
			});
		}
		const missingPermission = tool.permissionsRequired.find((permission) => !context.availablePermissions.has(permission) && !context.availablePermissions.has('*'));
		if (missingPermission) {
			return createToolResult<TOutput>({
				toolId: tool.id,
				success: false,
				error: {
					code: 'PERMISSION_DENIED',
					message: `missing permission: ${missingPermission}`,
					retryable: false,
					category: 'permission',
				},
				startedAt,
				finishedAt: new Date(),
			});
		}
		const rateLimited = this.checkRateLimit<TOutput>(tool, context, startedAt);
		if (rateLimited) return rateLimited;
		const overLimit = this.checkTurnLimit<TOutput>(tool.id, context, startedAt);
		if (overLimit) return overLimit;
		const needsConfirmation = tool.metadata.requiresConfirmation === true || (!tool.metadata.readOnly && TOOL_SAFETY_ORDER[tool.safetyLevel] >= TOOL_SAFETY_ORDER.high);
		if (needsConfirmation) {
			const actionId = `${tool.id}:${JSON.stringify(redactSensitive(input))}`;
			if (!context.confirmedActionIds.has(actionId) && !context.confirmedActionIds.has('*')) {
				const confirmed = context.requestConfirmation
					? await context.requestConfirmation({
							toolId: tool.id,
							toolName: tool.name,
							reason: context.reasonForUse ?? 'sensitive action requested',
							inputPreview: redactSensitive(input),
							permissions: tool.permissionsRequired,
							safetyLevel: tool.safetyLevel,
						})
					: false;
				if (!confirmed) {
					return createToolResult<TOutput>({
						toolId: tool.id,
						success: false,
						error: {
							code: 'CONFIRMATION_REQUIRED',
							message: `explicit confirmation is required before using ${tool.name}`,
							retryable: false,
							category: 'permission',
						},
						startedAt,
						finishedAt: new Date(),
					});
				}
			}
		}
		return undefined;
	}

	private checkRateLimit<TOutput>(
		tool: Tool,
		context: ToolExecutionContext,
		startedAt: Date
	): ToolResult<TOutput> | undefined {
		if (!tool.rateLimit) return undefined;
		const scopeKey =
			tool.rateLimit.scope === 'user'
				? context.userId ?? 'anonymous'
				: tool.rateLimit.scope === 'session'
					? context.sessionId
					: tool.id;
		const key = `${tool.id}:${scopeKey}`;
		const now = startedAt.getTime();
		const bucket = (this.rateLimitBuckets.get(key) ?? []).filter((timestamp) => now - timestamp < tool.rateLimit!.windowMs);
		if (bucket.length >= tool.rateLimit.maxCalls) {
			this.rateLimitBuckets.set(key, bucket);
			return createToolResult<TOutput>({
				toolId: tool.id,
				success: false,
				error: {
					code: 'RATE_LIMITED',
					message: `rate limit exceeded for ${tool.name}`,
					retryable: true,
					category: 'rateLimit',
				},
				startedAt,
				finishedAt: new Date(),
			});
		}
		bucket.push(now);
		this.rateLimitBuckets.set(key, bucket);
		return undefined;
	}

	private checkTurnLimit<TOutput>(toolId: string, context: ToolExecutionContext, startedAt: Date): ToolResult<TOutput> | undefined {
		const turnKey = context.turnId ?? context.sessionId;
		const count = (this.turnCallCounts.get(turnKey) ?? 0) + 1;
		this.turnCallCounts.set(turnKey, count);
		if (count <= this.maxToolCallsPerTurn) return undefined;
		return createToolResult<TOutput>({
			toolId,
			success: false,
			error: {
				code: 'MAX_TOOL_CALLS_EXCEEDED',
				message: `maximum tool calls per turn exceeded (${this.maxToolCallsPerTurn})`,
				retryable: false,
				category: 'safety',
			},
			startedAt,
			finishedAt: new Date(),
		});
	}

	private async withTimeout<TOutput>(
		promise: Promise<ToolResult<TOutput>>,
		timeoutMs: number,
		toolId: string,
		retryCount: number,
		startedAt: Date
	): Promise<ToolResult<TOutput>> {
		let timer: NodeJS.Timeout | undefined;
		try {
			return await Promise.race([
				promise,
				new Promise<ToolResult<TOutput>>((resolve) => {
					timer = setTimeout(() => {
						resolve(
							createToolResult<TOutput>({
								toolId,
								success: false,
								error: {
									code: 'TOOL_TIMEOUT',
									message: `tool timed out after ${timeoutMs}ms`,
									retryable: true,
									category: 'timeout',
								},
								startedAt,
								finishedAt: new Date(),
								retryCount,
							})
						);
					}, timeoutMs);
				}),
			]);
		} finally {
			if (timer) clearTimeout(timer);
		}
	}

	private finalizeResult<TInput, TOutput>(
		tool: Tool<TInput, TOutput>,
		result: ToolResult<TOutput>,
		startedAt: Date,
		retryCount: number
	): ToolResult<TOutput> {
		return {
			...result,
			toolId: tool.id,
			startedAt: startedAt.toISOString(),
			finishedAt: new Date().toISOString(),
			durationMs: Date.now() - startedAt.getTime(),
			retryCount,
			warnings: result.warnings ?? [],
			metadata: result.metadata ?? {},
		};
	}

	private errorResult<TOutput>(toolId: string, startedAt: Date, retryCount: number, error: unknown): ToolResult<TOutput> {
		const retryable = error instanceof ToolTransientError;
		return createToolResult<TOutput>({
			toolId,
			success: false,
			error: {
				code: retryable ? 'TRANSIENT_TOOL_ERROR' : 'TOOL_PROVIDER_ERROR',
				message: error instanceof Error ? error.message : 'tool failed',
				retryable,
				category: retryable ? 'provider' : 'unknown',
			},
			startedAt,
			finishedAt: new Date(),
			retryCount,
		});
	}

	private async audit<TInput, TOutput>(
		tool: Tool<TInput, TOutput>,
		input: TInput,
		context: ToolExecutionContext,
		result: ToolResult<TOutput>
	): Promise<void> {
		await this.auditLog.record({
			toolId: tool.id,
			sanitizedInput: redactSensitive(input),
			sanitizedOutputSummary: summarizeOutput(result.success ? result.data : result.error),
			success: result.success,
			latencyMs: result.durationMs,
			retryCount: result.retryCount,
			userId: context.userId,
			sessionId: context.sessionId,
			reasonForUse: context.reasonForUse,
			selectedAlternatives: context.selectedAlternatives ?? [],
			timestamp: new Date().toISOString(),
		});
	}
}

function shouldRetry(result: ToolResult): boolean {
	if (result.success) return false;
	return result.error?.retryable === true;
}
