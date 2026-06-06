export interface JSONSchema {
	type?: string;
	properties?: Record<string, unknown>;
	required?: string[];
	items?: unknown;
	description?: string;
	enum?: unknown[];
	additionalProperties?: boolean | unknown;
	[k: string]: unknown;
}

export type ToolResultBlock =
	| { type: 'text'; text: string }
	| { type: 'image'; mimeType?: string; base64?: string };

export type AgentToolResultStatus = 'ok' | 'error' | 'blocked' | 'rejected';

export interface ToolContext {
	workspace: string;
	sessionId: string;
	readState: Map<string, { mtimeMs: number; size: number }>;
	plan: { entries: Array<{ task: string; status: 'pending' | 'in_progress' | 'done' }> };
	signal?: AbortSignal;
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
	needsApproval?: boolean | ((args: TArgs, ctx: ToolContext) => boolean | Promise<boolean>);
	execute(args: TArgs, ctx: ToolContext): Promise<AgentToolResult<TDetails>>;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
