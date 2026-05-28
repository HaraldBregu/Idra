import type { AgentTool, AgentToolResult, ToolContext } from './core/types';
import { evaluateToolRequestPolicy } from './access';

type JsonSchema = {
	type?: string;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	additionalProperties?: boolean;
	items?: JsonSchema;
};

export type ToolCategory = string;
export type ToolSafetyLevel = 'low' | 'medium' | 'high';
export type ToolPrivacyLevel = 'public' | 'private' | 'sensitive';

export interface ToolResult<T = unknown> {
	toolId: string;
	success: boolean;
	data?: T;
	error?: {
		code: string;
		message: string;
		retryable?: boolean;
		category?: string;
	};
	warnings: string[];
	retryCount?: number;
}

export interface SessionContext {
	sessionId: string;
	userTimezone: string;
	availablePermissions: Set<string>;
	confirmedActionIds: Set<string>;
	metadata?: Record<string, unknown>;
}

export interface ToolExecutionContext extends SessionContext {
	now: Date;
	turnId: string;
	signal?: AbortSignal;
	requestConfirmation?: (request: {
		toolId: string;
		toolName: string;
		permissions: string[];
		safetyLevel: ToolSafetyLevel;
	}) => Promise<boolean>;
}

export interface Tool<Input = Record<string, unknown>, Output = unknown> {
	id: string;
	name: string;
	description: string;
	category: ToolCategory;
	inputSchema: JsonSchema;
	outputSchema: JsonSchema;
	permissionsRequired: string[];
	safetyLevel: ToolSafetyLevel;
	costEstimate: Record<string, unknown>;
	latencyEstimate: Record<string, unknown>;
	reliabilityScore: number;
	rateLimit?: unknown;
	examples: Array<Record<string, unknown>>;
	tags: string[];
	enabled: boolean;
	version: string;
	owner: string;
	metadata: {
		privacyLevel: ToolPrivacyLevel;
		readOnly: boolean;
		requiresConfirmation?: boolean;
		executionTimeoutMs?: number;
		authoritative?: boolean;
	};
	execute(input: Input, context: ToolExecutionContext): Promise<ToolResult<Output>>;
}

export interface RankedTool<TTool = Tool> {
	tool: TTool;
	score: number;
	explanations: string[];
}

export class ToolTransientError extends Error {
	readonly retryable = true;
}

const GENERIC_TOOL_ACTION_TOKENS = new Set([
	'read',
	'write',
	'edit',
	'create',
	'delete',
	'copy',
	'move',
	'find',
	'search',
	'show',
	'list',
	'open',
	'run',
	'execute',
]);

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: AgentTool[];
}

export interface AgentToolManagementOptions {
	executor?: ToolExecutor;
	maxToolCallsPerTurn?: number;
	enabled?: boolean;
	forceSelection?: boolean;
	maxPromptTools?: number;
}

export class ToolExecutor {
	readonly maxToolCallsPerTurn?: number;
	private readonly defaultTimeoutMs: number;
	private readonly maxRetries: number;
	private readonly sleep: (ms: number) => Promise<void>;
	private readonly callCounts = new Map<string, number>();

	constructor(options: {
		maxToolCallsPerTurn?: number;
		defaultTimeoutMs?: number;
		maxRetries?: number;
		sleep?: (ms: number) => Promise<void>;
	} = {}) {
		this.maxToolCallsPerTurn = options.maxToolCallsPerTurn;
		this.defaultTimeoutMs = options.defaultTimeoutMs ?? 30_000;
		this.maxRetries = options.maxRetries ?? 0;
		this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
	}

	async execute<Input, Output>(
		tool: Tool<Input, Output>,
		input: Input,
		context: ToolExecutionContext
	): Promise<ToolResult<Output>> {
		const callKey = `${context.sessionId}:${context.turnId}`;
		const callCount = (this.callCounts.get(callKey) ?? 0) + 1;
		this.callCounts.set(callKey, callCount);
		if (this.maxToolCallsPerTurn !== undefined && callCount > this.maxToolCallsPerTurn) {
			return createToolResult({
				toolId: tool.id,
				success: false,
				error: {
					code: 'MAX_TOOL_CALLS_EXCEEDED',
					message: 'maximum tool calls for this turn exceeded',
				},
			});
		}

		let retryCount = 0;
		for (;;) {
			const result = await this.executeOnce(tool, input, context);
			if (result.success || result.error?.retryable !== true || retryCount >= this.maxRetries) {
				return { ...result, retryCount };
			}
			retryCount++;
			await this.sleep(10 * retryCount);
		}
	}

	private async executeOnce<Input, Output>(
		tool: Tool<Input, Output>,
		input: Input,
		context: ToolExecutionContext
	): Promise<ToolResult<Output>> {
		const controller = new AbortController();
		const timeoutMs = tool.metadata.executionTimeoutMs ?? this.defaultTimeoutMs;
		let timeout: ReturnType<typeof setTimeout> | undefined;
		const timeoutResult = new Promise<ToolResult<Output>>((resolve) => {
			timeout = setTimeout(() => {
				controller.abort();
				resolve(createToolResult({
					toolId: tool.id,
					success: false,
					error: { code: 'TOOL_TIMEOUT', message: `tool ${tool.id} timed out` },
				}));
			}, timeoutMs);
		});
		try {
			const run = tool.execute(input, { ...context, signal: controller.signal });
			const result = await Promise.race([run, timeoutResult]);
			if (timeout) clearTimeout(timeout);
			if (!result.success) return result;
			const validated = new ToolOutputValidator().validate(result, tool.outputSchema);
			return {
				...result,
				data: validated.normalizedData as Output,
				warnings: [...result.warnings, ...validated.warnings],
			};
		} catch (error) {
			if (timeout) clearTimeout(timeout);
			const transient = error instanceof ToolTransientError;
			return createToolResult({
				toolId: tool.id,
				success: false,
				error: {
					code: transient ? 'TOOL_TRANSIENT_ERROR' : 'TOOL_ERROR',
					message: error instanceof Error ? error.message : String(error),
					retryable: transient,
				},
			});
		}
	}
}

export function createToolResult<T>(input: {
	toolId: string;
	success: boolean;
	data?: T;
	error?: ToolResult<T>['error'];
	warnings?: string[];
}): ToolResult<T> {
	return {
		toolId: input.toolId,
		success: input.success,
		data: input.data,
		error: input.error,
		warnings: input.warnings ?? [],
	};
}

export function createToolRegistry(tools: Tool[]): ToolRegistry {
	return new ToolRegistry(tools);
}

export class ToolRegistry {
	private readonly tools = new Map<string, Tool>();
	private readonly disabled = new Set<string>();

	constructor(tools: Tool[]) {
		for (const tool of tools) this.tools.set(tool.id, tool);
	}

	list(): Tool[] {
		return [...this.tools.values()].filter((tool) => tool.enabled && !this.disabled.has(tool.id));
	}

	disableTool(id: string): void {
		this.disabled.add(id);
	}
}

export class ToolDiscovery {
	constructor(private readonly registry: ToolRegistry) {}

	discover(input: {
		userIntent: string;
		sessionContext: SessionContext;
		topN: number;
	}): RankedTool[] {
		return this.registry.list()
			.filter((tool) => hasRequiredPermissions(tool.permissionsRequired, input.sessionContext.availablePermissions))
			.map((tool) => rankManagedTool(tool, input.userIntent))
			.filter((entry) => entry.score > 0)
			.sort((left, right) => right.score - left.score || left.tool.id.localeCompare(right.tool.id))
			.slice(0, input.topN);
	}
}

export class ToolSelector {
	async select(input: {
		userRequest: string;
		rankedTools: RankedTool[];
		sessionContext: SessionContext;
	}): Promise<{ type: 'useTool'; toolId: string; reason: string } | { type: 'noTool'; reason: string }> {
		const [best] = input.rankedTools;
		if (!best) return { type: 'noTool', reason: 'no matching tool' };
		return { type: 'useTool', toolId: best.tool.id, reason: best.explanations[0] ?? 'best match' };
	}
}

export class ToolArgumentBuilder {
	build<TInput extends Record<string, unknown>>(tool: Tool<TInput>, input: {
		intendedCall: Record<string, unknown>;
		sessionContext: SessionContext;
	}): { type: 'valid'; input: TInput } | { type: 'clarificationRequired'; missingFields?: string[]; reason?: string } {
		const schema = tool.inputSchema;
		const required = schema.required ?? [];
		const missing = required.filter((field) => input.intendedCall[field] === undefined);
		if (missing.length > 0) return { type: 'clarificationRequired', missingFields: missing };
		if (schema.additionalProperties === false) {
			const known = new Set(Object.keys(schema.properties ?? {}));
			const extra = Object.keys(input.intendedCall).filter((field) => !known.has(field));
			if (extra.length > 0) return { type: 'clarificationRequired', reason: 'unknown fields' };
		}
		const normalized: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(input.intendedCall)) {
			normalized[key] = normalizeArgumentValue(key, value, input.sessionContext);
		}
		return { type: 'valid', input: normalized as TInput };
	}
}

export class ToolPlanner {
	createPlan(input: {
		goal: string;
		decision: { type: 'useTool'; toolId: string; reason: string };
		rankedTools: RankedTool[];
		maxSteps: number;
	}): { goal: string; steps: Array<{ toolId: string; fallbackToolIds: string[] }> } {
		const fallbackToolIds = input.rankedTools
			.map((entry) => entry.tool.id)
			.filter((id) => id !== input.decision.toolId)
			.slice(0, Math.max(0, input.maxSteps - 1));
		return {
			goal: input.goal,
			steps: [{ toolId: input.decision.toolId, fallbackToolIds }],
		};
	}
}

export class ToolOutputValidator {
	validate<T>(result: ToolResult<T>, _schema: JsonSchema): {
		status: 'ok' | 'suspicious' | 'contradictory';
		normalizedData: T;
		warnings: string[];
	} {
		const warnings: string[] = [];
		let status: 'ok' | 'suspicious' | 'contradictory' = 'ok';
		const normalizedData = sanitizeToolOutput(result.data, warnings) as T;
		if (warnings.length > 0) status = 'suspicious';
		if (hasContradictoryValues(normalizedData)) {
			status = 'contradictory';
			warnings.push('contradictory tool output detected');
		}
		return { status, normalizedData, warnings };
	}
}

export class ToolConflictResolver {
	resolve(input: Array<{ rankedTool: RankedTool; result: ToolResult }>): {
		type: 'useResult';
		result: ToolResult;
	} | { type: 'noResult' } {
		const successful = input.filter((entry) => entry.result.success);
		if (successful.length === 0) return { type: 'noResult' };
		successful.sort((left, right) => {
			const leftAuthoritative = left.rankedTool.tool.metadata.authoritative === true ? 1 : 0;
			const rightAuthoritative = right.rankedTool.tool.metadata.authoritative === true ? 1 : 0;
			return rightAuthoritative - leftAuthoritative
				|| right.rankedTool.tool.reliabilityScore - left.rankedTool.tool.reliabilityScore
				|| right.rankedTool.score - left.rankedTool.score;
		});
		return { type: 'useResult', result: successful[0]!.result };
	}
}

export class MemoryPolicy {
	evaluateToolOutput(tool: Tool, _result: ToolResult): { shouldStore: boolean; reason?: string } {
		if (tool.metadata.privacyLevel === 'sensitive') {
			return { shouldStore: false, reason: 'sensitive tool output' };
		}
		return { shouldStore: true };
	}
}

export function selectAgentToolsForTurn(
	tools: AgentTool[],
	message: string,
	_ctx: ToolContext,
	options?: AgentToolManagementOptions
): AgentToolSelectionForTurn {
	if (tools.length === 0 || hasNoToolIntent(message) || isImmediateBackgroundTask(message)) {
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	}
	if (isToolInventoryQuestion(message)) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: tools };
	}

	const ranked = rankToolsForPrompt(tools, message);
	const matched = ranked.filter((entry) => entry.score > 0);
	const toolsForPrompt = selectPromptTools(matched, message, options);
	const promptToolNames = new Set(toolsForPrompt.map((tool) => tool.name));
	const rankedForPrompt = matched.filter((entry) => promptToolNames.has(entry.tool.name));
	const systemPromptSuffix =
		options?.forceSelection && toolsForPrompt.length > 0
			? renderSelectedToolPrompt(toolsForPrompt)
			: '';
	return { toolsForPrompt, systemPromptSuffix, rankedTools: rankedForPrompt as unknown as AgentTool[] };
}

function rankToolsForPrompt(tools: readonly AgentTool[], message: string): Array<{ tool: AgentTool; score: number; explanations: string[] }> {
	const tokens = tokenizeForCapabilityMatch(message);
	const intent = inferToolIntent(message, tokens);
	return tools
		.map((tool) => {
			const score = scoreTool(tool, tokens, intent);
			return { tool: decorateAgentTool(tool, intent), score, explanations: score > 0 ? [`matched ${intent}`] : [] };
		})
		.sort((left, right) => right.score - left.score || left.tool.name.localeCompare(right.tool.name));
}

function scoreTool(tool: AgentTool, queryTokens: ReadonlySet<string>, intent: ToolIntent): number {
	const toolTokens = tokenizeForCapabilityMatch(toolText(tool));
	let score = 0;
	for (const token of queryTokens) {
		if (intent === 'none' && GENERIC_TOOL_ACTION_TOKENS.has(token)) continue;
		if (toolTokens.has(token)) score += 8;
		else if ([...toolTokens].some((toolToken) => toolToken.includes(token) || token.includes(toolToken))) score += 3;
	}
	if (intent === 'scheduled' && hasAny(toolTokens, ['cron', 'schedule', 'scheduled', 'recurring', 'reminder', 'wake'])) score += 80;
	if (intent === 'email' && hasAny(toolTokens, ['gmail', 'email', 'mail', 'inbox'])) score += 60;
	if (intent === 'calendar' && hasAny(toolTokens, ['calendar', 'agenda', 'event', 'events'])) score += 60;
	if (intent === 'drive' && hasAny(toolTokens, ['drive', 'file', 'files', 'document', 'documents'])) score += 50;
	if (intent === 'web' && hasAny(toolTokens, ['web', 'fetch', 'weather', 'current', 'latest'])) score += 50;
	if (intent === 'run_shell' && hasAny(toolTokens, ['shell', 'script', 'command', 'python', 'node', 'bash', 'execute', 'run', 'terminal'])) score += 80;
	if (intent === 'file_read' && hasAny(toolTokens, ['read', 'find', 'grep', 'list', 'search'])) score += 40;
	if (intent === 'file_write' && hasAny(toolTokens, ['write', 'edit', 'create', 'save', 'update'])) score += 40;
	if (intent === 'file_move' && hasAny(toolTokens, ['move', 'rename', 'copy'])) score += 70;
	return score;
}

function toolText(tool: AgentTool): string {
	return [tool.name, tool.displayName, tool.displaySummary, tool.description].filter(Boolean).join(' ');
}

type ToolIntent =
	| 'none'
	| 'scheduled'
	| 'email'
	| 'calendar'
	| 'drive'
	| 'web'
	| 'run_shell'
	| 'file_read'
	| 'file_write'
	| 'file_move';

function inferToolIntent(message: string, tokens: ReadonlySet<string>): ToolIntent {
	const normalized = normalizeForCapabilityMatch(message);
	const fileContext = hasFileContext(message, tokens);
	if (/\b(email|gmail|inbox|mail)\b/.test(normalized)) return 'email';
	if (/\b(calendar|agenda|meeting|event|events)\b/.test(normalized)) return 'calendar';
	if (/\b(google drive|drive|document|documents)\b/.test(normalized)) return 'drive';
	if (/\b(every|daily|weekly|monthly|tomorrow|tonight|schedule|scheduled|remind|reminder|recurring|cron)\b/.test(normalized)) return 'scheduled';
	if (/\b(weather|latest|current|web|url|http|fetch)\b/.test(normalized)) return 'web';
	if (/\b(shell|script|scripts|python|node|bash|terminal|command)\b/.test(normalized) && hasAny(tokens, ['run', 'execute', 'start', 'open'])) return 'run_shell';
	if (fileContext && hasAny(tokens, ['move', 'rename', 'copy'])) return 'file_move';
	if (fileContext && hasAny(tokens, ['write', 'edit', 'patch', 'create', 'delete', 'save', 'update'])) return 'file_write';
	if (fileContext && hasAny(tokens, ['read', 'find', 'inspect', 'search', 'show', 'list', 'open'])) return 'file_read';
	return 'none';
}

function hasFileContext(message: string, tokens: ReadonlySet<string>): boolean {
	return hasAny(tokens, ['file', 'files', 'folder', 'folders', 'path', 'workspace', 'repo', 'repository', 'code', 'source', 'directory'])
		|| /[\w.-]+\.(?:ts|tsx|js|jsx|json|md|txt|yaml|yml|css|html|py|go|rs|java|kt|swift|sql)\b/i.test(message);
}

function hasNoToolIntent(message: string): boolean {
	return /\b(do not use tools|don't use tools|without tools|answer from memory|no tools)\b/i.test(message);
}

function isToolInventoryQuestion(message: string): boolean {
	return /\b(what tools do you have|do you have (?:any )?(?:internal )?tools|available tools|list tools|tool inventory)\b/i.test(message);
}

function isImmediateBackgroundTask(message: string): boolean {
	return /\brun a task in background(?: now)?\b/i.test(message);
}

function tokenizeForCapabilityMatch(value: string): ReadonlySet<string> {
	const normalized = normalizeForCapabilityMatch(value);
	if (!normalized) return new Set();
	return new Set(normalized.split(/\s+/).filter((token) => token.length >= 3));
}

function normalizeForCapabilityMatch(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasAny(values: ReadonlySet<string>, candidates: readonly string[]): boolean {
	return candidates.some((candidate) => values.has(candidate));
}

export async function executeAgentToolWithManagement(
	tool: AgentTool,
	args: Record<string, unknown>,
	ctx: ToolContext,
	_management: AgentToolManagementOptions
): Promise<AgentToolResult> {
	return tool.execute(args, ctx);
}

export function agentToolToManagedTool(tool: AgentTool): Tool<Record<string, unknown>, AgentToolResult> {
	return {
		id: tool.name,
		name: tool.name,
		description: tool.description,
		category: inferManagedCategory(tool.name, tool.description),
		inputSchema: tool.schema as JsonSchema,
		outputSchema: { type: 'object' },
		permissionsRequired: [],
		safetyLevel: tool.needsApproval ? 'high' : 'low',
		costEstimate: { amount: 0, currency: 'none', unit: 'call', tier: 'free' },
		latencyEstimate: { p50Ms: 10, p95Ms: 100 },
		reliabilityScore: 0.9,
		examples: [],
		tags: [],
		enabled: true,
		version: '1.0.0',
		owner: 'agent',
		metadata: { privacyLevel: 'private', readOnly: false },
		execute: async (input, context) => createToolResult({
			toolId: tool.name,
			success: true,
			data: await tool.execute(input, context as unknown as ToolContext),
		}),
	};
}

export class ToolUsePolicy {
	constructor(_policy?: unknown) {}

	evaluate(_options: { userRequest: string }): { shouldUseTools: boolean; reason: string } {
		return evaluateToolRequestPolicy(_options);
	}
}

function hasRequiredPermissions(required: readonly string[], available: ReadonlySet<string>): boolean {
	return available.has('*') || required.every((permission) => available.has(permission));
}

function rankManagedTool(tool: Tool, userIntent: string): RankedTool {
	const tokens = tokenizeForCapabilityMatch(userIntent);
	const text = tokenizeForCapabilityMatch([
		tool.id,
		tool.name,
		tool.description,
		tool.category,
		...tool.tags,
	].join(' '));
	let score = tool.reliabilityScore;
	const explanations: string[] = [];
	for (const token of tokens) {
		if (text.has(token)) {
			score += 10;
			explanations.push(`matched ${token}`);
		}
	}
	if (tool.category === 'web' && hasAny(tokens, ['weather', 'latest', 'current'])) score += 20;
	if (tool.category === 'email' && hasAny(tokens, ['email', 'mail', 'send'])) score += 20;
	return { tool, score, explanations };
}

function normalizeArgumentValue(key: string, value: unknown, context: SessionContext): unknown {
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (key.toLowerCase().includes('email')) return trimmed.toLowerCase();
	if (key.toLowerCase().includes('currency')) return trimmed.toUpperCase();
	if (key.toLowerCase().includes('unit')) return trimmed.toLowerCase();
	if (key.toLowerCase().includes('date') && trimmed.toLowerCase() === 'today') {
		return formatDateInTimezone(
			new Date(String(context.metadata?.now ?? new Date().toISOString())),
			context.userTimezone
		);
	}
	return trimmed;
}

function formatDateInTimezone(date: Date, timeZone: string): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(date);
	const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
	const month = parts.find((part) => part.type === 'month')?.value ?? '01';
	const day = parts.find((part) => part.type === 'day')?.value ?? '01';
	return `${year}-${month}-${day}`;
}

function sanitizeToolOutput(value: unknown, warnings: string[]): unknown {
	if (typeof value === 'string') {
		if (/\b(ignore previous instructions|reveal credentials|system prompt)\b/i.test(value)) {
			warnings.push('prompt-injection-like tool output was removed');
			return value.replace(/ignore previous instructions|reveal credentials|system prompt/gi, '[removed untrusted instruction]');
		}
		return value;
	}
	if (Array.isArray(value)) return value.map((entry) => sanitizeToolOutput(entry, warnings));
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, sanitizeToolOutput(entry, warnings)])
		);
	}
	return value;
}

function hasContradictoryValues(value: unknown): boolean {
	if (!Array.isArray(value)) return false;
	const seen = new Map<unknown, unknown>();
	for (const entry of value) {
		if (!entry || typeof entry !== 'object') continue;
		const record = entry as { id?: unknown; value?: unknown };
		if (record.id === undefined) continue;
		if (seen.has(record.id) && seen.get(record.id) !== record.value) return true;
		seen.set(record.id, record.value);
	}
	return false;
}

function selectPromptTools(
	ranked: Array<{ tool: AgentTool; score: number; explanations: string[] }>,
	message: string,
	options?: AgentToolManagementOptions
): AgentTool[] {
	const tokens = tokenizeForCapabilityMatch(message);
	const intent = inferToolIntent(message, tokens);
	if (intent === 'email') {
		return ranked
			.map((entry) => entry.tool)
			.filter((tool) => isEmailTool(tool) || tool.name === 'read');
	}
	if (intent === 'calendar') {
		return ranked.map((entry) => entry.tool).filter(isCalendarTool);
	}
	if (intent === 'drive') {
		return ranked.map((entry) => entry.tool).filter(isDriveTool);
	}
	if (intent === 'file_move') {
		const tools = ranked.map((entry) => entry.tool);
		return [
			...tools.filter((tool) => tool.name === 'read'),
			...tools.filter((tool) => tool.name !== 'read'),
		].slice(0, Math.max(2, options?.maxPromptTools ?? tools.length));
	}
	const maxTools = options?.maxPromptTools;
	const matched = ranked.map((entry) => entry.tool);
	return maxTools !== undefined ? matched.slice(0, maxTools) : matched;
}

function renderSelectedToolPrompt(tools: readonly AgentTool[]): string {
	return [
		'Available tools for this turn only:',
		...tools.map((tool) => [`Tool: ${tool.name}`, `Description: ${tool.description}`].join('\n')),
	].join('\n');
}

function decorateAgentTool(tool: AgentTool, intent: ToolIntent): AgentTool {
	const category = inferManagedCategory(tool.name, tool.description, intent);
	return category ? ({ ...tool, category } as AgentTool) : tool;
}

function inferManagedCategory(name: string, description: string, intent?: ToolIntent): string {
	const text = `${name} ${description}`.toLowerCase();
	if (intent === 'email' || /\b(gmail|email|mail|inbox)\b/.test(text)) return 'email';
	if (intent === 'calendar' || /\b(calendar|agenda|event)\b/.test(text)) return 'calendar';
	if (intent === 'drive' || /\b(google drive|drive)\b/.test(text)) return 'drive';
	if (intent === 'web' || /\b(web|weather|fetch)\b/.test(text)) return 'web';
	return '';
}

function isEmailTool(tool: AgentTool): boolean {
	return inferManagedCategory(tool.name, tool.description) === 'email';
}

function isCalendarTool(tool: AgentTool): boolean {
	return inferManagedCategory(tool.name, tool.description) === 'calendar';
}

function isDriveTool(tool: AgentTool): boolean {
	return inferManagedCategory(tool.name, tool.description) === 'drive';
}
