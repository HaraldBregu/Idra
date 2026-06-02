import type { AgentTool } from '../base/common';
import { markCoreTool } from '../base/common';
import type { AgentTool as LegacyAgentTool, FridayServices, ToolContext } from '../base/tool';
import { legacyToolToCanonical } from '../runtime/bridge';
import { editFileTool } from './edit_file';
import { grepTool } from './grep';
import { listDirectoryTool } from './list_directory';
import { readFileTool } from './read_file';
import { runShellTool } from './run_shell';
import { searchFilesTool } from './search_files';
import { undoLastOperationTool } from './undo_last_operation';
import { writeTool } from './write';
import { completeTaskTool } from './complete_task';
import { listTodosTool } from './list_todos';
import { readScratchTool } from './read_scratch';
import { updateTodoTool } from './update_todo';
import { writeScratchTool } from './write_scratch';
import { writeTodosTool } from './write_todos';
import { presentPlanTool } from './present_plan';
import { requestApprovalTool } from './request_approval';
import { requestAuthorizationTool } from './request_authorization';
import { requestClarificationTool } from './request_clarification';
import { spawnSubagentTool } from './spawn_subagent';
import { listSkillsTool } from './list_skills';
import { loadSkillTool } from './load_skill';
import { useSkillTool } from './use_skill';
import { callMcpToolTool } from './call_mcp_tool';
import { connectMcpServerTool } from './connect_mcp_server';
import { listMcpPromptsTool } from './list_mcp_prompts';
import { listMcpResourcesTool } from './list_mcp_resources';
import { listMcpServersTool } from './list_mcp_servers';
import { listMcpToolsTool } from './list_mcp_tools';
import { loadMcpPromptTool } from './load_mcp_prompt';
import { loadMcpToolTool } from './load_mcp_tool';
import { readMcpResourceTool } from './read_mcp_resource';
import { refreshMcpServerTool } from './refresh_mcp_server';

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
