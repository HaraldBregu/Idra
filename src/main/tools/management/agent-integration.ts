import type { AgentTool, AgentToolResult, ToolContext } from '../core/types';
import { textResult } from '../core/types';
import { ToolArgumentBuilder } from './argument-builder';
import { redactSensitive } from './audit-log';
import { agentToolToManagedTool, createAgentToolRegistry } from './adapter';
import { ToolDiscovery } from './discovery';
import { ToolExecutor } from './executor';
import { ToolPromptBuilder } from './prompting';
import { isToolIntrospectionRequest, ToolUsePolicy } from './use-policy';
import type {
	RankedTool,
	RelevantMemory,
	SessionContext,
	ToolConfirmationRequest,
	ToolExecutionContext,
	ToolResult,
} from './types';
import { TOOL_LIMITS } from '../limits';

export interface AgentToolManagementOptions {
	enabled?: boolean;
	forceSelection?: boolean;
	useWhenToolCountExceeds?: number;
	maxPromptTools?: number;
	maxToolCallsPerTurn?: number;
	availablePermissions?: string[];
	userTimezone?: string;
	memory?: RelevantMemory;
	sessionContext?: Partial<SessionContext>;
	executor?: ToolExecutor;
	argumentBuilder?: ToolArgumentBuilder;
	requestConfirmation?: (request: ToolConfirmationRequest) => Promise<boolean>;
}

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: RankedTool[];
}

export function selectAgentToolsForTurn(
	tools: AgentTool[],
	userMessage: string,
	ctx: ToolContext,
	options: AgentToolManagementOptions = {}
): AgentToolSelectionForTurn {
	if (options.enabled === false)
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	const policy = new ToolUsePolicy().evaluate({ userRequest: userMessage });
	if (!policy.shouldUseTools && policy.reason === 'user explicitly disabled tool use') {
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	}
	if (isToolIntrospectionRequest(userMessage.toLowerCase())) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	}
	const threshold =
		options.useWhenToolCountExceeds ?? TOOL_LIMITS.prompt.useSelectionWhenToolCountExceeds;
	if (!options.forceSelection && tools.length <= threshold) {
		return { toolsForPrompt: tools, systemPromptSuffix: '', rankedTools: [] };
	}
	if (!policy.shouldUseTools)
		return { toolsForPrompt: [], systemPromptSuffix: '', rankedTools: [] };
	const registry = createAgentToolRegistry(tools);
	const sessionContext = createSessionContext(ctx, options);
	const rankedTools = new ToolDiscovery(registry).discover({
		userIntent: userMessage,
		sessionContext,
		memory: options.memory,
		topN: options.maxPromptTools ?? TOOL_LIMITS.prompt.defaultMaxTools,
	});
	const selectedNames = new Set(rankedTools.map((entry) => entry.tool.name));
	const forcedToolNames = new Set([
		...selectGoogleCalendarToolNames(tools, userMessage),
		...selectGoogleDriveToolNames(tools, userMessage),
		...selectGmailToolNames(tools, userMessage),
	]);
	for (const toolName of forcedToolNames) {
		selectedNames.add(toolName);
	}
	const addedPrerequisites = addPrerequisiteToolNames(selectedNames, tools);
	const toolsForPrompt = tools.filter((tool) => selectedNames.has(tool.name));
	const rankedToolsWithForced = appendSelectedRankedTools(
		rankedTools,
		registry,
		forcedToolNames,
		'forced selected for matching connector intent'
	);
	const rankedToolsForPrompt = appendPrerequisiteRankedTools(
		rankedToolsWithForced,
		registry,
		addedPrerequisites
	);
	const systemPromptSuffix =
		rankedToolsForPrompt.length > 0
			? new ToolPromptBuilder().buildCompactPrompt(rankedToolsForPrompt)
			: '';
	return { toolsForPrompt, systemPromptSuffix, rankedTools: rankedToolsForPrompt };
}

const TOOL_PREREQUISITES: Record<string, string[]> = {
	write: ['read'],
	edit: ['read'],
	apply_patch: ['read'],
	delete: ['read'],
	copy: ['read'],
	move: ['read'],
};

function selectGoogleCalendarToolNames(tools: AgentTool[], userMessage: string): Set<string> {
	const request = userMessage.toLowerCase();
	if (!/\b(google calendar|calendar|agenda|availability|available|free|busy|meetings?|events?|appointments?|schedule)\b/.test(request)) {
		return new Set();
	}

	const suffixes = new Set<string>(['list_calendars', 'search_events']);
	if (/\b(fetch|read|details?|open)\b/.test(request)) {
		suffixes.add('read_event');
		suffixes.add('fetch');
	}
	if (/\b(create|add|schedule|book|new)\b/.test(request)) suffixes.add('create_event');
	if (/\b(update|reschedule|move|change|edit|modify)\b/.test(request)) suffixes.add('update_event');
	if (/\b(delete|cancel|remove)\b/.test(request)) suffixes.add('delete_event');

	return new Set(
		tools
			.filter(isGoogleCalendarTool)
			.filter((tool) => [...suffixes].some((suffix) => tool.name.endsWith(`_${suffix}`)))
			.map((tool) => tool.name)
	);
}

function isGoogleCalendarTool(tool: AgentTool): boolean {
	const text = `${tool.name} ${tool.description}`.toLowerCase();
	return text.includes('google calendar') || text.includes('google_calendar');
}

function selectGoogleDriveToolNames(tools: AgentTool[], userMessage: string): Set<string> {
	const request = userMessage.toLowerCase();
	if (!/\b(google drive|my drive|shared drive|drive files?|drive documents?|drive folders?)\b/.test(request)) {
		return new Set();
	}

	const suffixes = new Set<string>(['search_files']);
	if (/\b(recent|latest|modified|changed|list|show)\b/.test(request)) suffixes.add('list_recent_files');
	if (/\b(fetch|read|content|contents|open|summarize|summary)\b/.test(request)) {
		suffixes.add('read_file_content');
		suffixes.add('get_file_metadata');
	}
	if (/\b(metadata|details?|info|properties)\b/.test(request)) suffixes.add('get_file_metadata');
	if (/\b(permission|permissions|sharing|shared with|access)\b/.test(request)) suffixes.add('get_file_permissions');
	if (/\b(download|export)\b/.test(request)) suffixes.add('download_file_content');
	if (/\b(create|new|upload|save|write)\b/.test(request)) suffixes.add('create_file');

	return new Set(
		tools
			.filter(isGoogleDriveTool)
			.filter((tool) => [...suffixes].some((suffix) => tool.name.endsWith(`_${suffix}`)))
			.map((tool) => tool.name)
	);
}

function isGoogleDriveTool(tool: AgentTool): boolean {
	const text = `${tool.name} ${tool.description}`.toLowerCase();
	return text.includes('google drive') || text.includes('google_drive');
}

function selectGmailToolNames(tools: AgentTool[], userMessage: string): Set<string> {
	const request = userMessage.toLowerCase();
	if (!/\b(gmail|email|emails|mail|inbox|messages?)\b/.test(request)) {
		return new Set();
	}

	const suffixes = new Set<string>();
	if (/\b(profile|account)\b/.test(request)) suffixes.add('get_profile');
	if (/\b(latest|recent|received|inbox|check|list|show|messages?|emails?)\b/.test(request)) {
		suffixes.add('get_recent_emails');
	}
	if (/\b(search|find|from|sender|to|subject|unread|important|label|google|received)\b/.test(request)) {
		suffixes.add('search_emails');
	}
	if (/\b(read|summarize|summary|important|body|content|full|details?|open)\b/.test(request)) {
		suffixes.add('batch_read_email');
		suffixes.add('read_email');
	}
	if (/\b(draft|compose)\b/.test(request)) suffixes.add('create_draft');
	if (/\b(send|reply|forward)\b/.test(request)) suffixes.add('send_email');
	if (/\b(trash|delete|remove)\b/.test(request)) suffixes.add('trash_email');
	if (suffixes.size === 0) {
		suffixes.add('get_recent_emails');
		suffixes.add('search_emails');
	}

	return new Set(
		tools
			.filter(isGmailTool)
			.filter((tool) => [...suffixes].some((suffix) => tool.name.endsWith(`_${suffix}`)))
			.map((tool) => tool.name)
	);
}

function isGmailTool(tool: AgentTool): boolean {
	const text = `${tool.name} ${tool.description}`.toLowerCase();
	return text.includes('gmail') || text.includes('google mail');
}

function addPrerequisiteToolNames(selectedNames: Set<string>, tools: AgentTool[]): Set<string> {
	const availableNames = new Set(tools.map((tool) => tool.name));
	const added = new Set<string>();
	for (const name of [...selectedNames]) {
		for (const prerequisite of TOOL_PREREQUISITES[name] ?? []) {
			if (!availableNames.has(prerequisite) || selectedNames.has(prerequisite)) continue;
			selectedNames.add(prerequisite);
			added.add(prerequisite);
		}
	}
	return added;
}

function appendSelectedRankedTools(
	rankedTools: RankedTool[],
	registry: ReturnType<typeof createAgentToolRegistry>,
	selectedNames: Set<string>,
	explanation: string
): RankedTool[] {
	if (selectedNames.size === 0) return rankedTools;
	const existing = new Set(rankedTools.map((entry) => entry.tool.name));
	const out = [...rankedTools];
	for (const name of selectedNames) {
		if (existing.has(name)) continue;
		const tool = registry.listTools().find((candidate) => candidate.name === name);
		if (!tool) continue;
		out.push({ tool, score: 0, explanations: [explanation] });
	}
	return out;
}

function appendPrerequisiteRankedTools(
	rankedTools: RankedTool[],
	registry: ReturnType<typeof createAgentToolRegistry>,
	addedPrerequisites: Set<string>
): RankedTool[] {
	if (addedPrerequisites.size === 0) return rankedTools;
	const existing = new Set(rankedTools.map((entry) => entry.tool.name));
	const out = [...rankedTools];
	for (const name of addedPrerequisites) {
		if (existing.has(name)) continue;
		const tool = registry.listTools().find((candidate) => candidate.name === name);
		if (!tool) continue;
		out.push({
			tool,
			score: 0,
			explanations: ['required prerequisite for selected file tool'],
		});
	}
	return out;
}

export async function executeAgentToolWithManagement(
	tool: AgentTool,
	args: unknown,
	ctx: ToolContext,
	options: AgentToolManagementOptions = {}
): Promise<AgentToolResult> {
	const managed = agentToolToManagedTool(tool);
	const sessionContext = createSessionContext(ctx, options);
	const builder = options.argumentBuilder ?? new ToolArgumentBuilder();
	const built = builder.build(managed, {
		intendedCall: args,
		sessionContext,
		memory: options.memory,
	});
	if (built.type === 'clarificationRequired') return textResult(built.question, true);
	const approval = await ensureLegacyApproval(tool, built.input, ctx, options, managed.id);
	if (approval) return approval;
	const executor =
		options.executor ?? new ToolExecutor({ maxToolCallsPerTurn: options.maxToolCallsPerTurn });
	const result = await executor.execute(
		managed,
		built.input,
		createExecutionContext(ctx, sessionContext, options, tool.name, managed.id, built.input)
	);
	if (result.success && result.data) {
		if (result.warnings.length === 0) return result.data;
		return {
			...result.data,
			content: [
				...result.data.content,
				{ type: 'text', text: `tool warnings: ${result.warnings.join('; ')}` },
			],
		};
	}
	return toolExecutorFailureToAgentResult(result);
}

async function ensureLegacyApproval(
	tool: AgentTool,
	input: unknown,
	ctx: ToolContext,
	options: AgentToolManagementOptions,
	managedToolId: string
): Promise<AgentToolResult | undefined> {
	if (!(await legacyApprovalRequired(tool, input, ctx))) return undefined;
	const key = legacyApprovalKey(tool.name, input);
	if (ctx.approvalCache.has(key)) return undefined;
	if (!options.requestConfirmation) return rejectedApprovalResult(tool.name);
	const approved = await options.requestConfirmation({
		toolId: managedToolId,
		toolName: tool.name,
		reason: `Tool ${tool.name} requires approval before execution.`,
		inputPreview: redactSensitive(input),
		permissions: [],
		safetyLevel: 'high',
	});
	if (!approved) return rejectedApprovalResult(tool.name);
	ctx.approvalCache.add(key);
	return undefined;
}

async function legacyApprovalRequired(
	tool: AgentTool,
	input: unknown,
	ctx: ToolContext
): Promise<boolean> {
	if (ctx.approvalRequired.has(tool.name)) return true;
	if (tool.needsApproval === true) return true;
	if (typeof tool.needsApproval !== 'function') return false;
	return tool.needsApproval(input as Record<string, unknown>, ctx);
}

function legacyApprovalKey(toolName: string, input: unknown): string {
	return `${toolName}::${JSON.stringify(input ?? {})}`;
}

function rejectedApprovalResult(toolName: string): AgentToolResult {
	return {
		status: 'rejected',
		content: [{ type: 'text', text: `tool ${toolName} requires approval before execution.` }],
		details: { reason: 'approval_required', toolName },
	};
}

function toolExecutorFailureToAgentResult(result: ToolResult<AgentToolResult>): AgentToolResult {
	if (
		result.error?.code === 'TOOL_CONFIRMATION_REQUIRED' ||
		result.error?.code === 'TOOL_CONFIRMATION_REJECTED'
	) {
		return {
			status: 'rejected',
			content: [{ type: 'text', text: result.error.message }],
			details: { reason: result.error.code, toolId: result.toolId },
		};
	}
	return textResult(result.error?.message ?? 'tool failed', true);
}

function createSessionContext(
	ctx: ToolContext,
	options: AgentToolManagementOptions
): SessionContext {
	return {
		userId: options.sessionContext?.userId,
		sessionId: ctx.sessionId,
		userTimezone:
			options.userTimezone ??
			options.sessionContext?.userTimezone ??
			Intl.DateTimeFormat().resolvedOptions().timeZone,
		availablePermissions: new Set(options.availablePermissions ?? ['*']),
		confirmedActionIds: options.sessionContext?.confirmedActionIds,
		privacyConstraints: options.sessionContext?.privacyConstraints,
		safetyConstraints: options.sessionContext?.safetyConstraints,
		metadata: options.sessionContext?.metadata,
	};
}

function createExecutionContext(
	ctx: ToolContext,
	sessionContext: SessionContext,
	options: AgentToolManagementOptions,
	toolName: string,
	managedToolId: string,
	input: unknown
): ToolExecutionContext {
	const confirmedActionIds = new Set(options.sessionContext?.confirmedActionIds ?? []);
	if (ctx.approvalCache.has(legacyApprovalKey(toolName, input))) {
		confirmedActionIds.add(`${managedToolId}:${JSON.stringify(redactSensitive(input))}`);
	}
	return {
		userId: sessionContext.userId,
		sessionId: ctx.sessionId,
		userTimezone: sessionContext.userTimezone,
		now: new Date(),
		availablePermissions: sessionContext.availablePermissions,
		confirmedActionIds,
		signal: ctx.signal,
		reasonForUse: 'model selected tool',
		turnId: ctx.sessionId,
		metadata: { legacyToolContext: ctx, ...sessionContext.metadata },
		requestConfirmation: options.requestConfirmation,
	};
}
