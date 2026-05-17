import type { CronService, OpenClawCronActor } from '../cron';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
import type { UserDataDirectoryServicePort } from '../user-data';
import type { WorkspaceService } from '../workspace';
import type { JSONSchema, ToolResultBlock } from '../provider/types';
import type { ApprovalDecision } from '../../shared/service';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
}

export interface FridayServices {
	store: StoreService;
	cron: CronService;
	eventBus: EventBus;
	logger: LoggerService;
	userDataDirectory: UserDataDirectoryServicePort;
	workspace: WorkspaceService;
}

export interface ApprovalStreamLike {
	ask(question: string, args?: unknown, toolName?: string): Promise<ApprovalDecision | null>;
}

export interface ElicitationStreamLike {
	ask(question: string, suggestions?: string[]): Promise<string>;
}

export interface ToolContext {
	/** Workspace root (absolute path). */
	workspace: string;
	/** Agent id that owns this run, when available. */
	agentId?: string;
	/** Cron authorization context supplied by the Gateway for owner or cron-self calls. */
	cronContext?: OpenClawCronActor;
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
	/** Legacy compatibility set; tools no longer block on human approval. */
	approvalRequired: Set<string>;
	/** Filesystem exposure policy for model-visible host tools. */
	fsPolicy?: { workspaceOnly?: boolean; readOnly?: boolean };
	/** Legacy compatibility cache (keyed by tool+args). */
	approvalCache: Set<string>;
	/** Legacy approval stream; no agent tool execution path should require it. */
	approveStream?: ApprovalStreamLike;
	/** Elicitation stream for explicit host-provided input collection. */
	elicit?: ElicitationStreamLike;
	/** Friday-side services (store, cron, event-bus, logger, user data, workspace). */
	services: FridayServices;
}

export interface AgentToolResult<TDetails = unknown> {
	status: 'ok' | 'error';
	content: ToolResultBlock[];
	details?: TDetails;
}

export interface AgentTool<TArgs = Record<string, unknown>, TDetails = unknown> {
	name: string;
	description: string;
	schema: JSONSchema;
	/** Legacy approval marker; execution proceeds without human approval. */
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
