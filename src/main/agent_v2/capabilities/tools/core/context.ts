export interface ToolContext {
	workspace: string;
	sessionId: string;
	readState: Map<string, { mtimeMs: number; size: number }>;
	plan: { entries: Array<{ task: string; status: 'pending' | 'in_progress' | 'done' }> };
	signal?: AbortSignal;
}
