import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/types';
import { legacyToolToCanonical } from '../runtime/bridge';
import {
	applyPatchTool,
	copyTool,
	deleteTool,
	editTool,
	editFileTool,
	filesystemCreateTool,
	filesystemListTool,
	findTool,
	gitDiffTool,
	gitStatusTool,
	grepTool,
	inspectFileTool,
	listDirectoryTool,
	moveTool,
	readFileTool,
	readTool,
	runShellTool,
	searchFilesTool,
	undoLastOperationTool,
	writeFileTool,
	writeTool,
} from './tools';
import {
	completeTaskTool,
	listTodosTool,
	readScratchTool,
	updateTodoTool,
	writeScratchTool,
	writeTodosTool,
} from '../state/tools';
import {
	presentPlanTool,
	requestApprovalTool,
	requestAuthorizationTool,
	requestClarificationTool,
} from '../human/tools';
import { spawnSubagentTool } from '../subagent/tools';
import { listSkillsTool, loadSkillTool, useSkillTool } from '../skills/tools';
import {
	callMcpToolTool,
	connectMcpServerTool,
	listMcpPromptsTool,
	listMcpResourcesTool,
	listMcpServersTool,
	listMcpToolsTool,
	loadMcpPromptTool,
	loadMcpToolTool,
	readMcpResourceTool,
	refreshMcpServerTool,
} from '../mcp/tools';
import { webFetchTool } from '../web/tools';
import { openBrowserTool } from '../app';
import { execTool, processTool } from '../exec/tools';
import { cronTool } from '../cron/tools';
import { taskTool } from '../task/tools';

export type FileToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	fsPolicy?: ToolContext['fsPolicy'];
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyFileTool = LegacyAgentTool<any, any>;

const FILE_TOOLS: readonly LegacyFileTool[] = [
	readFileTool,
	writeFileTool,
	editFileTool,
	listDirectoryTool,
	searchFilesTool,
	grepTool,
	runShellTool,
	readTool,
	writeTool,
	editTool,
	applyPatchTool,
	deleteTool,
	copyTool,
	moveTool,
	inspectFileTool,
	findTool,
	filesystemCreateTool,
	filesystemListTool,
	gitStatusTool,
	gitDiffTool,
	undoLastOperationTool,
	writeTodosTool,
	updateTodoTool,
	listTodosTool,
	completeTaskTool,
	writeScratchTool,
	readScratchTool,
	requestApprovalTool,
	requestClarificationTool,
	presentPlanTool,
	requestAuthorizationTool,
	spawnSubagentTool,
	listSkillsTool,
	loadSkillTool,
	useSkillTool,
	listMcpServersTool,
	connectMcpServerTool,
	refreshMcpServerTool,
	listMcpToolsTool,
	loadMcpToolTool,
	callMcpToolTool,
	listMcpResourcesTool,
	readMcpResourceTool,
	listMcpPromptsTool,
	loadMcpPromptTool,
	webFetchTool,
	openBrowserTool,
	execTool,
	processTool,
	cronTool,
	taskTool,
] as const;

export function createFileTools(options: FileToolOptions): AgentTool[] {
	const context = createFileToolContext(options);
	return FILE_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

export function createReadTool(options: FileToolOptions): AgentTool {
	const read = createFileTools(options).find((tool) => tool.name === 'read_file');
	if (!read) throw new Error('read tool is not registered');
	return read;
}

function createFileToolContext(options: FileToolOptions): ToolContext {
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
