import type { JSONSchema, ToolResultBlock } from '../../provider/types';
import type { AgentToolResultStatus } from '../../../shared/agents/constants';

export interface PlanEntry {
	task: string;
	status: 'pending' | 'in_progress' | 'done';
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
	fsPolicy?: { workspaceOnly?: boolean; writeWorkspaceOnly?: boolean; readOnly?: boolean };
	signal?: AbortSignal;
	approvalRequired?: Set<string>;
	approvalCache?: Set<string>;
	services: Record<string, unknown>;
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
	serviceKind?: 'tool' | 'connector' | 'mcp';
	serviceId?: string;
	ownerOnly?: boolean;
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}

export function jsonResult(value: unknown): AgentToolResult {
	return { status: 'ok', content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

export function blockedToolResult(text: string): AgentToolResult {
	return { status: 'blocked', content: [{ type: 'text', text }] };
}
