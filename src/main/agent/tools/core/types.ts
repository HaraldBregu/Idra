import type { EventBus } from '../../../core/event-bus';
import type { LoggerService } from '../../../logger';
import type { CronService } from '../../../cron';
import type { AgentMcpClientServicePort } from '../../mcp-client';
import type { ConnectorToolServicePort } from '../../../connectors';
import type { PolicyServicePort } from '../../policy';
import type { StoreService } from '../../../store';
import type { TasksService } from '../../../tasks';
import type { McpRegistry } from '../../mcp';
import type { SkillsService } from '../../../skills';
import type { UserDataDirectoryServicePort } from '../../../user-data';
import type { WorkspaceService } from '../../../workspace';
import type { JSONSchema, ToolResultBlock } from '../../../provider/types';
import type { AgentCapabilityServiceKind, AgentToolResultStatus } from '../../../../shared/agents/constants';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export interface FridayServices {
	store: StoreService;
	eventBus: EventBus;
	logger: LoggerService;
	userDataDirectory: UserDataDirectoryServicePort;
	workspace: WorkspaceService;
	cron?: CronService;
	policy?: PolicyServicePort;
	taskManager?: TasksService;
	connectors?: ConnectorToolServicePort;
	mcpClient?: AgentMcpClientServicePort;
	skills?: SkillsService;
	mcpRegistry?: McpRegistry;
}

export type CronToolContext =
	| { role: 'owner'; agentId?: string }
	| { role: 'subagent'; agentId?: string }
	| { role: 'http'; userId?: string }
	| { role: 'cron-self'; jobId?: string; agentId?: string; sessionKey?: string | null };

export interface ToolContext {
	/** Workspace root (absolute path). */
	workspace: string;
	/** Agent id that owns this run, when available. */
	agentId?: string;
	/** Scheduled-task actor context for cron-triggered runs. */
	cronContext?: CronToolContext;
	/** Best-effort live chat delivery context for tools that can persist follow-up work. */
	deliveryContext?: Record<string, unknown>;
	/** Run-scoped id used by the run logger / session. */
	sessionId: string;
	/** Optional override for persisted session files. */
	sessionBaseDir?: string;
	/** Visibility policy for session coordination and session-derived memory. */
	sessionVisibility?: 'self' | 'tree' | 'agent' | 'all';
	/** Per-file read tracker for the read-before-write rule. */
	readState: Map<string, { mtimeMs: number; size: number }>;
	/** Current plan; tools may read or replace. */
	plan: { entries: PlanEntry[] };
	/** Filesystem exposure policy for model-visible host tools. */
	fsPolicy?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	/** Abort signal for the current tool call or agent run. */
	signal?: AbortSignal;
	approvalRequired?: Set<string>;
	approvalCache?: Set<string>;
	/** Friday-side services (store, event-bus, logger, user data, workspace). */
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
	/** Marks control-plane tools that should only be exposed to owner contexts. */
	ownerOnly?: boolean;
	/** Approval marker; execution is blocked unless the call is confirmed. */
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
