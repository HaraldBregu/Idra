import { cronTool } from './cron';
import { execTool, processTool } from './exec';
import { editTool, findTool, readTool, writeTool } from './fs';
import { filterTools, type PolicyConfig } from './policy';
import { startupFilesTool } from './startup';
import { webFetchTool } from './web';
import type { AgentTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: AgentTool<any, any>[] = [
	readTool,
	writeTool,
	editTool,
	findTool,
	execTool,
	processTool,
	startupFilesTool,
	webFetchTool,
	cronTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS as unknown as AgentTool[], cfg);
}
