export type ToolResultBlock =
	| { type: 'text'; text: string }
	| { type: 'image'; mimeType?: string; base64?: string };

export type AgentToolResultStatus = 'ok' | 'error' | 'blocked' | 'rejected';

export interface AgentToolResult<TDetails = unknown> {
	status: AgentToolResultStatus;
	content: ToolResultBlock[];
	details?: TDetails;
}

export function textResult(text: string, isError = false): AgentToolResult {
	return { status: isError ? 'error' : 'ok', content: [{ type: 'text', text }] };
}
