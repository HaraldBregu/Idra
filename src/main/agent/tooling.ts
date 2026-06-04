import type { EventBus } from '../services/event-bus';
import type { LoggerService } from '../observability';
import type { CronService } from '../cron';
import type { ConnectorsService } from '../connectors';
import type { StoreService } from '../store';
import type { SkillsService } from '../skills';
import type { WorkspaceService } from './workspace';
import type { JSONSchema, ToolResultBlock } from '../llm/types';
import type {
	AgentCapabilityServiceKind,
	AgentToolResultStatus,
} from '../../shared/agents/constants';
import type { ToolsService } from '../tools';

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

export interface ToolPolicyServicePort {
	evaluateToolRequest(input: { userRequest: string }): ToolRequestPolicyDecision;
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

export type ToolsServicePort = Pick<
	ToolsService,
	| 'createDefaultTools'
	| 'filterToolsByAllowlist'
	| 'filterToolsByDenylist'
	| 'createCallTracker'
	| 'createManagementOptions'
	| 'createBuiltInToolsForProvider'
	| 'evaluateToolRequest'
	| 'createStartupFilesTool'
	| 'prepareToolsForProvider'
	| 'selectToolsForTurn'
	| 'prepareToolsForRun'
	| 'beforeCall'
	| 'executeToolWithManagement'
>;

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
