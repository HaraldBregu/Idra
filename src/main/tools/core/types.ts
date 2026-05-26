import type { EventBus } from '../../core/event-bus';
import type { LoggerService } from '../../logger';
import type { AgentStartupFilesServicePort } from '../../agent/startup-files';
import type { CronServiceActionActor } from '../../cron';
import type { PolicyServicePort } from '../../policy';
import type { StoreService } from '../../store';
import type { TaskManager } from '../../tasks';
import type { UserDataDirectoryServicePort } from '../../user-data';
import type { WorkspaceService } from '../../workspace';
import type { JSONSchema, ToolResultBlock } from '../../provider/types';

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
	startupFiles: AgentStartupFilesServicePort;
	policy?: PolicyServicePort;
	taskManager?: TaskManager;
}


export interface ToolContext {
	/** Workspace root (absolute path). */
	workspace: string;
	/** Agent id that owns this run, when available. */
	agentId?: string;
	/** Scheduled-task actor context for cron-triggered runs. */
	cronContext?: CronServiceActionActor;
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
	/** Tools listed here require approval before execution. */
	approvalRequired: Set<string>;
	/** Filesystem exposure policy for model-visible host tools. */
	fsPolicy?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	/** Abort signal for the current tool call or agent run. */
	signal?: AbortSignal;
	/** Confirmed legacy calls, keyed by tool+args. */
	approvalCache: Set<string>;
	/** Friday-side services (store, event-bus, logger, user data, workspace). */
	services: FridayServices;
}

export interface AgentToolResult<TDetails = unknown> {
	status: 'ok' | 'error' | 'rejected';
	content: ToolResultBlock[];
	details?: TDetails;
}

export interface AgentTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	displaySummary?: string;
	description: string;
	schema: JSONSchema;
	/** Marks control-plane tools that should only be exposed to owner contexts. */
	ownerOnly?: boolean;
	/** Approval marker; execution is rejected unless the call is confirmed. */
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
