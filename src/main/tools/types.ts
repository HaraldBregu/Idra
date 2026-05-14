import type { CronService } from '../cron';
import type { EventBus } from '../core/event-bus';
import type { LoggerService } from '../logger';
import type { StoreService } from '../store';
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
	/** Run-scoped id used by the run logger / session. */
	sessionId: string;
	/** Per-file read tracker for the read-before-write rule. */
	readState: Map<string, { mtimeMs: number; size: number }>;
	/** Current plan; tools may read or replace. */
	plan: { entries: PlanEntry[] };
	/** Tool names that require human approval before each invocation. */
	approvalRequired: Set<string>;
	/** Approvals already granted this run (keyed by tool+args). */
	approvalCache: Set<string>;
	/** Approval stream — pluggable channel to the host. */
	approveStream?: ApprovalStreamLike;
	/** Elicitation stream — used by `ask_human` to collect input. */
	elicit?: ElicitationStreamLike;
	/** Friday-side services (store, cron, event-bus, logger, workspace). */
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
	/** Set to true (or a predicate) to gate every call behind approveStream. */
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
