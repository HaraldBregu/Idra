import { cronTool } from './cron';
import { execTool, processTool } from './exec';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	findTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from './fs';
import { filterTools, type PolicyConfig } from './policy';
import { startupFilesTool } from './startup';
import { taskTool } from './task';
import { webFetchTool } from './web';
import { openBrowserTool } from './app';
import { browserTool } from '../browser';
import type { AgentTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: AgentTool<any, any>[] = [
	readTool,
	writeTool,
	editTool,
	applyPatchTool,
	deleteTool,
	copyTool,
	moveTool,
	inspectFileTool,
	findTool,
	execTool,
	processTool,
	startupFilesTool,
	webFetchTool,
	cronTool,
	taskTool,
	openBrowserTool,
	browserTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS as unknown as AgentTool[], cfg);
}
