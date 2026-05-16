import { askHumanTool } from './ask-human';
import {
	setThemeModeTool,
	openAppDataFolderTool,
	openUserDataFolderTool,
	openFolderTool,
	openAccessibilityTool,
	openScreenRecordingTool,
	setMenuBarTool,
} from './app';
import { cronAddTool, cronListTool, cronRemoveTool, cronTool } from './cron';
import { execTool, processTool } from './exec';
import { applyPatchTool, editTool, findTool, readTool, writeTool } from './fs';
import { memoryGetTool, memorySearchTool } from './memory';
import { updatePlanTool } from './plan';
import { filterTools, type PolicyConfig } from './policy';
import { getProviderByIdTool, setProviderApiKeyTool } from './providers';
import {
	sessionStatusTool,
	sessionsHistoryTool,
	sessionsListTool,
	sessionsSendTool,
	sessionsSpawnTool,
	sessionsYieldTool,
	subagentsTool,
} from './sessions';
import { getAgentModelTool, getAgentServiceTool, setAgentServiceTool } from './services';
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
	memorySearchTool,
	memoryGetTool,
	sessionsListTool,
	sessionsHistoryTool,
	sessionsSendTool,
	sessionsSpawnTool,
	sessionsYieldTool,
	subagentsTool,
	sessionStatusTool,
	getWorkspaceContentTool,
	getWorkspacePathTool,
	getProviderByIdTool,
	setProviderApiKeyTool,
	getAgentServiceTool,
	getAgentModelTool,
	setAgentServiceTool,
	cronTool,
	cronAddTool,
	cronListTool,
	cronRemoveTool,
	setThemeModeTool,
	openFolderTool,
	openAppDataFolderTool,
	openUserDataFolderTool,
	openAccessibilityTool,
	openScreenRecordingTool,
	setMenuBarTool,
];

export function createTools(cfg: PolicyConfig): AgentTool[] {
	return filterTools(ALL_TOOLS as unknown as AgentTool[], cfg);
}
