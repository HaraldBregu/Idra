import type { AgentTool, AgentToolResult, AgentToolUpdate, ToolDiagnostics } from './common';
import {
	copyToolMetadata,
	getToolMetadata,
	sanitizeParamPreview,
	setToolMetadata,
	ToolInputError,
} from './common';
import { blockedToolResult, errorToolResult } from './results';

export type ToolApprovalDecision = 'allow-once' | 'allow-always' | 'deny' | boolean | null;
export type ToolApprovalResolution = 'allow-once' | 'allow-always' | 'deny' | 'timeout' | 'cancelled';

export type RequiredToolApproval = {
	title: string;
	description: string;
	severity?: 'info' | 'warning' | 'critical';
	timeoutMs?: number;
	timeoutBehavior?: 'allow' | 'deny';
	pluginId?: string;
	allowedDecisions?: ApprovalDecisionTuple;
	onResolution?: (resolution: ToolApprovalResolution) => void | Promise<void>;
};

type ApprovalDecisionTuple = ['allow-once', 'allow-always', 'deny'] | ['allow-once', 'deny'] | ['deny'];

export type BeforeToolCallHookResult =
	| void
	| {
			allow?: boolean;
			reason?: string;
			deniedReason?: string;
			params?: unknown;
			block?: boolean;
			blockReason?: string;
			requireApproval?: RequiredToolApproval;
	  };

export type BeforeToolCallHook = (input: {
	tool: AgentTool;
	toolCallId: string;
	params: unknown;
}) => Promise<BeforeToolCallHookResult> | BeforeToolCallHookResult;

export type BeforeToolCallContext = {
	runId?: string;
	diagnostics?: ToolDiagnostics;
	approvalRequired?: Set<string>;
	approval?: (request: {
		toolName: string;
		toolCallId: string;
		runId?: string;
		paramsPreview: unknown;
		derivedPaths?: string[];
		approval?: Omit<RequiredToolApproval, 'onResolution'>;
	}) => Promise<ToolApprovalDecision>;
	beforeToolCallHooks?: BeforeToolCallHook[];
	loopDetector?: CallTracker;
	loopWarnAt?: number;
	loopStopAt?: number;
	signal?: AbortSignal;
};

export type CallTracker = {
	counts: Map<string, number>;
};

export function newCallTracker(): CallTracker {
	return { counts: new Map() };
}

const DEFAULT_LOOP_WARN_AT = 3;
const DEFAULT_LOOP_STOP_AT = 5;

function callKey(toolName: string, params: unknown): string {
	return `${toolName}::${JSON.stringify(params ?? {})}`;
}

function approved(decision: ToolApprovalDecision): boolean {
	return decision === true || decision === 'allow-once' || decision === 'allow-always';
}

export function wrapToolWithBeforeToolCall(
	tool: AgentTool,
	context: BeforeToolCallContext = {}
): AgentTool {
	const wrapped: AgentTool = {
		...tool,
		async execute(toolCallId, rawParams, signal, onUpdate) {
			const startedAt = Date.now();
			const diagnostics = context.diagnostics;
			const effectiveSignal = signal ?? context.signal;
			let params = tool.prepareArguments ? tool.prepareArguments(rawParams) : rawParams;
			const tracker = context.loopDetector ?? newCallTracker();
			const key = callKey(tool.name, params);
			const count = (tracker.counts.get(key) ?? 0) + 1;
			tracker.counts.set(key, count);

			if (count > (context.loopStopAt ?? DEFAULT_LOOP_STOP_AT)) {
				const result = blockedToolResult({
					reason: `loop detector: identical call to ${tool.name} occurred ${count} times. Change approach.`,
					deniedReason: 'loop_detected',
				});
				diagnostics?.emit({
					type: 'tool.execution.blocked',
					message: result.content[0]?.type === 'text' ? result.content[0].text : undefined,
					details: { toolName: tool.name, toolCallId, reason: 'loop_detected' },
				});
				return result;
			}

			if (context.approvalRequired?.has(tool.name)) {
				const decision = context.approval
					? await context.approval({
							toolName: tool.name,
							toolCallId,
							runId: context.runId,
							paramsPreview: sanitizeParamPreview(params),
							derivedPaths: derivedPaths(params),
						})
					: null;
				if (!approved(decision)) {
					return blockedToolResult({
						reason: `Approval denied or unavailable for ${tool.name}.`,
						deniedReason: decision === 'deny' ? 'denied' : 'approval_unavailable',
					});
				}
			}

			for (const hook of context.beforeToolCallHooks ?? []) {
				const decision = await hook({ tool, toolCallId, params });
				if (!decision) continue;
				if (decision.params !== undefined) params = decision.params;
				if (decision.block === true || decision.allow === false) {
					return blockedToolResult({
						reason: decision.blockReason ?? decision.reason ?? `Tool ${tool.name} was blocked by policy.`,
						deniedReason: decision.deniedReason ?? 'hook_veto',
					});
				}
				if (decision.requireApproval) {
					const request = decision.requireApproval;
					const allowedDecisions = request.allowedDecisions ?? ['allow-once', 'allow-always', 'deny'];
					const approvalDecision = context.approval
						? await context.approval({
								toolName: tool.name,
								toolCallId,
								runId: context.runId,
								paramsPreview: sanitizeParamPreview(params),
								derivedPaths: derivedPaths(params),
								approval: {
									title: request.title,
									description: request.description,
									severity: request.severity,
									timeoutMs: request.timeoutMs,
									timeoutBehavior: request.timeoutBehavior,
									pluginId: request.pluginId,
									allowedDecisions,
								},
							})
						: null;
					const resolution = approvalResolution(approvalDecision, allowedDecisions);
					await request.onResolution?.(resolution);
					if (resolution === 'timeout' && request.timeoutBehavior === 'allow') continue;
					if (resolution !== 'allow-once' && resolution !== 'allow-always') {
						return blockedToolResult({
							reason: `Approval denied or unavailable for ${tool.name}.`,
							deniedReason: resolution === 'deny' ? 'denied' : 'approval_unavailable',
						});
					}
				}
			}

			if (count >= (context.loopWarnAt ?? DEFAULT_LOOP_WARN_AT)) {
				onUpdate?.({
					type: 'tool.execution.loop_warning',
					message: `This is the ${count}th identical call to ${tool.name}.`,
				});
			}

			diagnostics?.emit({
				type: 'tool.execution.started',
				details: { toolName: tool.name, toolCallId, params: sanitizeParamPreview(params) },
			});

			try {
				const forwardUpdate = (update: AgentToolUpdate): void => {
					diagnostics?.emit({ type: update.type, message: update.message, details: update.details });
					onUpdate?.(update);
				};
				const result = await tool.execute(toolCallId, params, effectiveSignal, forwardUpdate);
				diagnostics?.emit({
					type: 'tool.execution.completed',
					details: {
						toolName: tool.name,
						toolCallId,
						durationMs: Date.now() - startedAt,
						contentBlocks: Array.isArray(result.content) ? result.content.length : 0,
					},
				});
				return result;
			} catch (error) {
				const result =
					error instanceof ToolInputError
						? ({
								content: [{ type: 'text', text: error.message }],
								details: { status: 'input_error', message: error.message, details: error.details },
							} satisfies AgentToolResult)
						: errorToolResult({ toolName: tool.name, error });
				diagnostics?.emit({
					type: 'tool.execution.error',
					message: result.content[0]?.type === 'text' ? result.content[0].text : undefined,
					details: { toolName: tool.name, toolCallId, durationMs: Date.now() - startedAt },
				});
				return result;
			}
		},
	};
	copyToolMetadata(tool, wrapped);
	const metadata = getToolMetadata(wrapped);
	if (metadata) setToolMetadata(wrapped, { ...metadata, wrapped: true });
	return wrapped;
}

function derivedPaths(params: unknown): string[] | undefined {
	const paths = new Set<string>();
	collectPathValues(params, paths);
	return paths.size > 0 ? [...paths] : undefined;
}

function collectPathValues(value: unknown, paths: Set<string>): void {
	if (Array.isArray(value)) {
		for (const entry of value) collectPathValues(entry, paths);
		return;
	}
	if (!value || typeof value !== 'object') return;
	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		if ((key === 'path' || key === 'file' || key.endsWith('Path')) && typeof entry === 'string') {
			paths.add(entry);
		} else {
			collectPathValues(entry, paths);
		}
	}
}

function approvalResolution(
	decision: ToolApprovalDecision,
	allowedDecisions: readonly string[]
): ToolApprovalResolution {
	if (decision === true) return allowedDecisions.includes('allow-once') ? 'allow-once' : 'deny';
	if (decision === 'allow-once' || decision === 'allow-always' || decision === 'deny') {
		return allowedDecisions.includes(decision) ? decision : 'deny';
	}
	return 'timeout';
}
