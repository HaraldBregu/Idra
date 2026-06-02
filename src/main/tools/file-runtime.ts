import type { AgentTool } from './base/common';
import { markCoreTool } from './base/common';
import type { AgentTool as LegacyAgentTool, FridayServices, ToolContext } from './base/tool';
import { legacyToolToCanonical } from './runtime/bridge';
import { editFileTool } from './edit-file';
import { grepTool } from './grep';
import { listDirectoryTool } from './list-directory';
import { readFileTool } from './read-file';
import { runShellTool } from './run-shell';
import { searchFilesTool } from './search-files';
import { undoLastOperationTool } from './undo-last-operation';
import { writeTool } from './write';
import { completeTaskTool } from './complete-task';
import { listTodosTool } from './list-todos';
import { readScratchTool } from './read-scratch';
import { updateTodoTool } from './update-todo';
import { writeScratchTool } from './write-scratch';
import { writeTodosTool } from './write-todos';
import { presentPlanTool } from './present-plan';
import { requestApprovalTool } from './request-approval';
import { requestAuthorizationTool } from './request-authorization';
import { requestClarificationTool } from './request-clarification';
import { spawnSubagentTool } from './spawn-subagent';
import { listSkillsTool } from './list-skills';
import { loadSkillTool } from './load-skill';
import { useSkillTool } from './use-skill';
import { callMcpToolTool } from './call-mcp-tool';
import { connectMcpServerTool } from './connect-mcp-server';
import { listMcpPromptsTool } from './list-mcp-prompts';
import { listMcpResourcesTool } from './list-mcp-resources';
import { listMcpServersTool } from './list-mcp-servers';
import { listMcpToolsTool } from './list-mcp-tools';
import { loadMcpPromptTool } from './load-mcp-prompt';
import { loadMcpToolTool } from './load-mcp-tool';
import { readMcpResourceTool } from './read-mcp-resource';
import { refreshMcpServerTool } from './refresh-mcp-server';

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
	undoLastOperationTool,
	writeTool,
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
