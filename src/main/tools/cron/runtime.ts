import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/types';
import { legacyToolToCanonical } from '../runtime/bridge';
import {
	cronCreateTool,
	cronDeleteTool,
	cronListTool,
	cronReadTool,
	cronRunTool,
	cronStartTool,
	cronStopTool,
	cronUpdateTool,
} from './tools';

export type CronToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyCronTool = LegacyAgentTool<any, any>;

const CRON_TOOLS: readonly LegacyCronTool[] = [
	cronCreateTool,
	cronReadTool,
	cronUpdateTool,
	cronDeleteTool,
	cronListTool,
	cronStartTool,
	cronStopTool,
	cronRunTool,
] as const;

export function createCronTools(options: CronToolOptions): AgentTool[] {
	const context = createCronToolContext(options);
	return CRON_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

function createCronToolContext(options: CronToolOptions): ToolContext {
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
