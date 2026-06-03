import type { AgentTool } from '../base/common';
import { markCoreTool } from '../base/common';
import type { FridayServices, ToolContext } from '../base/tool';
import { legacyToolToCanonical } from '../base/runtime/bridge';
import { requestedTools } from './tools';

export type RequestedToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

export function createRequestedTools(options: RequestedToolOptions): AgentTool[] {
	const context: ToolContext = {
		workspace: options.workspaceDir,
		sessionId: options.sessionId ?? 'tool-run',
		readState: new Map(),
		plan: { entries: [] },
		approvalRequired: new Set(),
		approvalCache: new Set(),
		signal: options.signal,
		services: (options.services ?? {}) as FridayServices,
	};
	return requestedTools.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}
