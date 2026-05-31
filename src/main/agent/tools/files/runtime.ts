import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/types';
import { legacyToolToCanonical } from '../runtime/bridge';
import { applyPatchTool } from './apply-patch';
import { copyTool } from './copy';
import { deleteFileTool } from './delete-file';
import { editFileTool } from './edit-file';
import { grepTool } from './grep';
import { inspectFileTool } from './inspect-file';
import { listDirectoryTool } from './list-directory';
import { moveTool } from './move';
import { readFileTool } from './read-file';
import { runShellTool } from './run-shell';
import { searchFilesTool } from './search-files';
import { undoLastOperationTool } from './undo-last-operation';
import { writeTool } from './write';
import { completeTaskTool } from '../state/complete-task';
import { listTodosTool } from '../state/list-todos';
import { readScratchTool } from '../state/read-scratch';
import { updateTodoTool } from '../state/update-todo';
import { writeScratchTool } from '../state/write-scratch';
import { writeTodosTool } from '../state/write-todos';
import {
	presentPlanTool,
	requestApprovalTool,
	requestAuthorizationTool,
	requestClarificationTool,
} from '../human/tools';
import { spawnSubagentTool } from '../subagent/spawn-subagent';
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
import { openBrowserTool, taskTool, webFetchTool } from '../app';
import { execTool, processTool } from '../exec';
import { cronTool } from '../cron';

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
	editFileTool,
	listDirectoryTool,
	searchFilesTool,
	grepTool,
	runShellTool,
	writeTool,
	applyPatchTool,
	deleteFileTool,
	copyTool,
	moveTool,
	inspectFileTool,
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
	if (!read) throw new Error('read_file tool is not registered');
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
