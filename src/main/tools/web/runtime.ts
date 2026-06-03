import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/tool';
import { legacyToolToCanonical } from '../core/runtime/bridge';
import { openBrowserTool } from './open-browser';
import { webFetchTool } from './web-fetch';

export type AppToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyAppTool = LegacyAgentTool<any, any>;

const APP_TOOLS: readonly LegacyAppTool[] = [webFetchTool, openBrowserTool] as const;

export function createAppTools(options: AppToolOptions): AgentTool[] {
	const context = createAppToolContext(options);
	return APP_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

function createAppToolContext(options: AppToolOptions): ToolContext {
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
