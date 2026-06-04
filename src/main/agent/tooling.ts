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
import type { AgentStartupFilesServicePort } from './workspace/startup';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export interface FridayServices {
	store: StoreService;
	eventBus: EventBus;
	logger: LoggerService;
	workspace: WorkspaceService;
	cron?: CronService;
	connectors?: ConnectorsService;
	skills?: SkillsService;
}

export type CronToolContext =
	| { role: 'owner'; agentId?: string }
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
		explicitAllow?: string[];
		denylist?: string[];
	}): AgentTool[];
	filterToolsByAllowlist(
		tools: AgentTool[],
		allowlist: string[] | undefined
	): AgentTool[];
	filterToolsByDenylist(
		tools: AgentTool[],
		denylist: string[] | undefined
	): AgentTool[];
	createCallTracker(): any;
	createManagementOptions(options?: AgentToolManagementOptions): AgentToolManagementOptions;
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
		tracker: any
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
