import type { AgentTool, AgentToolResult, ToolContext } from './core/types';
import { PolicyService, type PolicyServicePort } from '../policy';

const defaultPolicyService = new PolicyService();
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

	constructor(options: { maxToolCallsPerTurn?: number } = {}) {
		this.maxToolCallsPerTurn = options.maxToolCallsPerTurn;
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
	const matched = ranked.filter((entry) => entry.score > 0).map((entry) => entry.tool);
	const maxTools = options?.maxPromptTools;
	const toolsForPrompt = maxTools !== undefined ? matched.slice(0, maxTools) : matched;
	return { toolsForPrompt, systemPromptSuffix: '', rankedTools: matched };
}

function rankToolsForPrompt(tools: readonly AgentTool[], message: string): Array<{ tool: AgentTool; score: number }> {
	const tokens = tokenizeForCapabilityMatch(message);
	const intent = inferToolIntent(message, tokens);
	return tools
		.map((tool) => ({ tool, score: scoreTool(tool, tokens, intent) }))
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
	if (intent === 'script_run' && hasAny(toolTokens, ['script', 'command', 'python', 'node', 'bash', 'execute', 'run', 'terminal'])) score += 80;
	if (intent === 'file_read' && hasAny(toolTokens, ['read', 'find', 'inspect', 'search'])) score += 40;
	if (intent === 'file_write' && hasAny(toolTokens, ['write', 'edit', 'patch', 'create', 'delete', 'copy', 'move'])) score += 40;
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
	| 'script_run'
	| 'file_read'
	| 'file_write'
	| 'file_move';

function inferToolIntent(message: string, tokens: ReadonlySet<string>): ToolIntent {
	const normalized = normalizeForCapabilityMatch(message);
	const fileContext = hasFileContext(message, tokens);
	if (/\b(every|daily|weekly|monthly|tomorrow|tonight|schedule|scheduled|remind|reminder|recurring|cron)\b/.test(normalized)) return 'scheduled';
	if (/\b(email|gmail|inbox|mail)\b/.test(normalized)) return 'email';
	if (/\b(calendar|agenda|meeting|event|events)\b/.test(normalized)) return 'calendar';
	if (/\b(google drive|drive|document|documents)\b/.test(normalized)) return 'drive';
	if (/\b(weather|latest|current|web|url|http|fetch)\b/.test(normalized)) return 'web';
	if (/\b(script|scripts|python|node|bash|terminal|command)\b/.test(normalized) && hasAny(tokens, ['run', 'execute', 'start', 'open'])) return 'script_run';
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
	return /\b(what tools do you have|available tools|list tools|tool inventory)\b/i.test(message);
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

export class ToolUsePolicy {
	constructor(
		private readonly policy: Pick<PolicyServicePort, 'evaluateToolRequest'> = defaultPolicyService
	) {}

	evaluate(_options: { userRequest: string }): { shouldUseTools: boolean; reason: string } {
		return this.policy.evaluateToolRequest(_options);
	}
}
