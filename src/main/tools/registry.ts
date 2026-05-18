import { cronTool } from './cron';
import { execTool, processTool } from './exec';
import { copyImagesTool, editTool, findTool, readTool, writeTool } from './fs';
import { filterTools, type PolicyConfig } from './policy';
import { startupFilesTool } from './startup';
import { webFetchTool } from './web';
import { openBrowserTool } from './app';
import { browserTool } from '../browser';
import type { AgentTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: AgentTool<any, any>[] = [
	readTool,
	copyImagesTool,
	writeTool,
	editTool,
	findTool,
	execTool,
	processTool,
	startupFilesTool,
	webFetchTool,
	cronTool,
	openBrowserTool,
	browserTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS as unknown as AgentTool[], cfg);
}
