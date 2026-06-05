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

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
