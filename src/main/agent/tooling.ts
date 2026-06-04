import type { EventBus } from '../services/event-bus';
import type { LoggerService } from '../observability';
import type { CronService } from '../cron';
import type { ConnectorsService } from '../connectors';
import type { StoreService } from '../store';
import type { SkillsService } from '../skills';
import type { WorkspaceService } from './workspace';
import type { JSONSchema, ProviderBuiltInToolSpec, ToolResultBlock } from '../llm/types';
import type {
	AgentCapabilityServiceKind,
	AgentToolResultStatus,
} from '../../shared/agents/constants';
import type { AgentStartupFilesServicePort } from './workspace/startup';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export type ToolPolicyProfile = 'minimal' | 'coding' | 'messaging' | 'standard' | 'full';

export type ToolPolicy = {
	profile?: ToolPolicyProfile;
	allow?: string[];
	alsoAllow?: string[];
	deny?: string[];
	fs?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
};

export type ToolRequestPolicyDecision = {
	shouldUseTools: boolean;
	reason: string;
};

export type ToolPolicySubject = {
	name: string;
	ownerOnly?: boolean;
	optional?: boolean;
	ownerKind?: string;
	pluginId?: string;
	groups?: string[];
};

export type ToolPolicyEvaluationContext = {
	sender?: { id?: string; isOwner?: boolean; trustedOwnerGrant?: boolean };
	trustedOwnerToolGrants?: string[];
	stages?: Record<string, ToolPolicy | undefined>;
	warnings?: string[];
};

export type ToolPolicyEvaluation = {
	allowed: Set<string>;
	filtered: Array<{ toolName: string; stage: string; reason: string }>;
	warnings: string[];
};

export interface ToolPolicyServicePort {
	createToolUseKey(toolName: string, params: unknown): string;
	evaluateTools(
		subjects: readonly ToolPolicySubject[],
		context?: ToolPolicyEvaluationContext
	): ToolPolicyEvaluation;
	evaluateToolUse(input: {
		toolName: string;
		params?: unknown;
		callCount: number;
		loopWarnAt?: number;
		loopStopAt?: number;
		requiresApproval?: boolean;
		approvalCached?: boolean;
	}): any;
	evaluateToolRequest(input: { userRequest: string }): ToolRequestPolicyDecision;
	evaluateToolHook(input: {
		toolName: string;
		allow?: boolean;
		block?: boolean;
		reason?: string;
		blockReason?: string;
		deniedReason?: string;
	}): any;
	evaluateToolApproval(input: {
		toolName: string;
		approvalAvailable: boolean;
		approvalDecision?: 'allow-once' | 'allow-always' | 'deny' | boolean | null;
		requiredReason?: string;
		deniedReason?: string;
	}): any;
	createToolPolicyIndex(subjects: readonly ToolPolicySubject[]): any;
	globMatchToolPolicyEntry(pattern: string, name: string): boolean;
	expandToolPolicyEntries(
		entries: readonly string[] | undefined,
		subjects: readonly ToolPolicySubject[],
		warnings?: string[],
		stage?: string
	): Set<string> | undefined;
	expandToolPolicyProfile(
		profile: ToolPolicyProfile | undefined,
		subjects: readonly ToolPolicySubject[],
		warnings?: string[],
		stage?: string
	): Set<string> | undefined;
	getToolPolicyStageOrder(): any;
	getCoreToolGroups(): Record<string, readonly string[]>;
}

export interface FridayServices {
	store: StoreService;
	eventBus: EventBus;
	logger: LoggerService;
	workspace: WorkspaceService;
	cron?: CronService;
	policy?: ToolPolicyServicePort;
	connectors?: ConnectorsService;
	skills?: SkillsService;
}

export type CronToolContext =
	| { role: 'owner'; agentId?: string }
	| { role: 'subagent'; agentId?: string }
	| { role: 'http'; userId?: string }
	| { role: 'cron-self'; jobId?: string; agentId?: string; sessionKey?: string | null };

export interface ToolContext {
	workspace: string;
	agentId?: string;
	cronContext?: CronToolContext;
	deliveryContext?: Record<string, unknown>;
	sessionId: string;
	sessionBaseDir?: string;
	sessionVisibility?: 'self' | 'tree' | 'agent' | 'all';
	readState: Map<string, { mtimeMs: number; size: number }>;
	plan: { entries: PlanEntry[] };
	signal?: AbortSignal;
	approvalRequired?: Set<string>;
	approvalCache?: Set<string>;
	services: FridayServices;
}

export interface AgentToolResult<TDetails = unknown> {
	status: AgentToolResultStatus;
	content: ToolResultBlock[];
	details?: TDetails;
}

export interface AgentTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	displayName?: string;
	displaySummary?: string;
	description: string;
	schema: JSONSchema;
	serviceKind?: AgentCapabilityServiceKind;
	serviceId?: string;
	ownerOnly?: boolean;
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export interface AgentToolSelectionForTurn {
	toolsForPrompt: AgentTool[];
	systemPromptSuffix: string;
	rankedTools: AgentTool[];
}

export interface AgentToolManagementOptions {
	enabled?: boolean;
	maxPromptTools?: number;
	maxToolCallsPerTurn?: number;
	forceSelection?: boolean;
}

export interface ToolRunPreparation extends AgentToolSelectionForTurn {
	management: AgentToolManagementOptions;
}

export interface ToolsServicePort {
	createDefaultTools(input: {
		toolPolicy?: ToolPolicy;
		explicitAllow?: string[];
		denylist?: string[];
	}): AgentTool[];
	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined,
		policy?: ToolPolicyServicePort
	): AgentTool[];
	filterToolsByDenylist(
		tools: AgentTool[],
		denylist: string[] | undefined,
		policy?: ToolPolicyServicePort
	): AgentTool[];
	createCallTracker(): unknown;
	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions;
	createBuiltInToolsForProvider(providerId: string): ProviderBuiltInToolSpec[];
	evaluateToolRequest(input: { userRequest: string }): ToolRequestPolicyDecision;
	createStartupFilesTool(
		agentId: string,
		startupFiles: AgentStartupFilesServicePort
	): AgentTool;
	prepareToolsForProvider(
		tools: AgentTool[],
		ctx: ToolContext,
		options?: { provider?: string; modelId?: string }
	): AgentTool[];
	selectToolsForTurn(
		tools: AgentTool[],
		message: string,
		ctx: ToolContext,
		options?: AgentToolManagementOptions
	): AgentToolSelectionForTurn;
	prepareToolsForRun(input: {
		tools: AgentTool[];
		ctx: ToolContext;
		userMessage: string;
		provider?: string;
		modelId?: string;
		management?: AgentToolManagementOptions;
	}): ToolRunPreparation;
	beforeCall(
		tool: AgentTool,
		args: unknown,
		ctx: ToolContext,
		tracker: unknown
	): Promise<{
		proceed: boolean;
		warning?: string;
		vetoStatus?: AgentToolResultStatus;
		vetoResult?: AgentToolResult;
		reason?: string;
	}>;
	executeToolWithManagement(
		tool: AgentTool,
		args: Record<string, unknown>,
		ctx: ToolContext,
		management: AgentToolManagementOptions
	): Promise<AgentToolResult>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
