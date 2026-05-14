import { askHumanTool } from './ask-human';
import { setThemeModeTool, openAppDataFolderTool, openAccessibilityTool, openScreenRecordingTool, setMenuBarTool } from './app';
import { cronAddTool, cronListTool, cronRemoveTool } from './cron';
import { execTool } from './exec';
import { editTool, findTool, readTool, writeTool } from './fs';
import { filterTools, type PolicyConfig } from './policy';
import { getProviderByIdTool, setProviderApiKeyTool } from './providers';
import { getAssistantModelTool, getAssistantServiceTool, setAssistantServiceTool } from './services';
import { getWorkspaceContentTool, getWorkspacePathTool } from './workspace';
import type { AgentTool } from './types';

export const ALL_TOOLS: AgentTool[] = [
	askHumanTool,
	readTool,
	writeTool,
	editTool,
	findTool,
	execTool,
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
	openAppDataFolderTool,
	openAccessibilityTool,
	openScreenRecordingTool,
	setMenuBarTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS, cfg);
}
