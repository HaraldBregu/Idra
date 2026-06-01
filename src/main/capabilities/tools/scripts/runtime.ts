import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/types';
import { legacyToolToCanonical } from '../runtime/bridge';
import { scriptRunTool } from './tools';

export type ScriptToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	fsPolicy?: ToolContext['fsPolicy'];
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyScriptTool = LegacyAgentTool<any, any>;

const SCRIPT_TOOLS: readonly LegacyScriptTool[] = [scriptRunTool] as const;

export function createScriptTools(options: ScriptToolOptions): AgentTool[] {
	const context = createScriptToolContext(options);
	return SCRIPT_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

function createScriptToolContext(options: ScriptToolOptions): ToolContext {
	return {
		workspace: options.workspaceDir,
		sessionId: options.sessionId ?? 'tool-run',
		readState: new Map(),
		plan: { entries: [] },
		approvalRequired: new Set(),
		approvalCache: new Set(),
		fsPolicy: options.fsPolicy,
		signal: options.signal,
		services: (options.services ?? {}) as FridayServices,
	};
}
