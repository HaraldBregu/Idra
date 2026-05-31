import type { AgentTool } from '../core/common';
import { markCoreTool } from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	FridayServices,
	ToolContext,
} from '../core/types';
import { legacyToolToCanonical } from '../runtime/bridge';
import { editFileTool } from './edit-file';
import { grepTool } from './grep';
import { listDirectoryTool } from './list-directory';
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
import { presentPlanTool } from '../human/present-plan';
import { requestApprovalTool } from '../human/request-approval';
import { requestAuthorizationTool } from '../human/request-authorization';
import { requestClarificationTool } from '../human/request-clarification';
import { spawnSubagentTool } from '../subagent/spawn-subagent';
import { listSkillsTool } from '../skills/list-skills';
import { loadSkillTool } from '../skills/load-skill';
import { useSkillTool } from '../skills/use-skill';
import { callMcpToolTool } from '../mcp/call-mcp-tool';
import { connectMcpServerTool } from '../mcp/connect-mcp-server';
import { listMcpPromptsTool } from '../mcp/list-mcp-prompts';
import { listMcpResourcesTool } from '../mcp/list-mcp-resources';
import { listMcpServersTool } from '../mcp/list-mcp-servers';
import { listMcpToolsTool } from '../mcp/list-mcp-tools';
import { loadMcpPromptTool } from '../mcp/load-mcp-prompt';
import { loadMcpToolTool } from '../mcp/load-mcp-tool';
import { readMcpResourceTool } from '../mcp/read-mcp-resource';
import { refreshMcpServerTool } from '../mcp/refresh-mcp-server';
import { startTaskTool } from '../app';

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
	startTaskTool,
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
