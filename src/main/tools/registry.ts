import { askHumanTool } from './ask-human';
import {
	setThemeModeTool,
	openAppDataFolderTool,
	openFolderTool,
	openAccessibilityTool,
	openScreenRecordingTool,
	setMenuBarTool,
} from './app';
import { cronAddTool, cronListTool, cronRemoveTool } from './cron';
import { execTool, processTool } from './exec';
import { applyPatchTool, editTool, findTool, readTool, writeTool } from './fs';
import { updatePlanTool } from './plan';
import { filterTools, type PolicyConfig } from './policy';
import { getProviderByIdTool, setProviderApiKeyTool } from './providers';
import { getAssistantModelTool, getAssistantServiceTool, setAssistantServiceTool } from './services';
import { getWorkspaceContentTool, getWorkspacePathTool } from './workspace';
import { webFetchTool } from './web';
import type { AgentTool } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_TOOLS: AgentTool<any, any>[] = [
	askHumanTool,
	readTool,
	writeTool,
	editTool,
	applyPatchTool,
	findTool,
	execTool,
	processTool,
	webFetchTool,
	updatePlanTool,
	getWorkspaceContentTool,
	getWorkspacePathTool,
	getProviderByIdTool,
	setProviderApiKeyTool,
	getAssistantServiceTool,
	getAssistantModelTool,
	setAssistantServiceTool,
	cronAddTool,
	cronListTool,
	cronRemoveTool,
	setThemeModeTool,
	openFolderTool,
	openAppDataFolderTool,
	openAccessibilityTool,
	openScreenRecordingTool,
	setMenuBarTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS as unknown as AgentTool[], cfg);
}
