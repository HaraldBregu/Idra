import type { AgentTool } from '../common';
import type { FridayServices, ToolContext } from '../tool';

export type ScriptToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

export function createScriptTools(options: ScriptToolOptions): AgentTool[] {
	createScriptToolContext(options);
	return [];
}

function createScriptToolContext(options: ScriptToolOptions): ToolContext {
	return {
		workspace: options.workspaceDir,
		sessionId: options.sessionId ?? 'tool-run',
		readState: new Map(),
		plan: { entries: [] },
		approvalRequired: new Set(),
		approvalCache: new Set(),
		signal: options.signal,
		services: (options.services ?? {}) as FridayServices,
	};
}
