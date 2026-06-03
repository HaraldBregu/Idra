import type { AgentTool } from '../base/common';
import { markCoreTool } from '../base/common';
import type { AgentTool as LegacyAgentTool, FridayServices, ToolContext } from '../base/tool';
import { legacyToolToCanonical } from '../base/runtime/bridge';
import { directoryListTool } from '../directory/list';
import { fileEditTool } from '../file/edit';
import { fileReadTool } from '../file/read';
import { execTool } from '../exec';
import { searchFilesTool } from '../file/search';
import { fileWriteTool } from '../file/write';
import { completeTaskTool } from '../todo/complete';
import { listTodosTool } from '../todo/list';
import { readScratchTool } from '../scratch/read';
import { updateTodoTool } from '../todo/update';
import { writeScratchTool } from '../scratch/write';
import { writeTodosTool } from '../todo/write';
import { presentPlanTool } from '../human/present-plan';
import { requestApprovalTool } from '../human/request-approval';
import { requestAuthorizationTool } from '../human/request-authorization';
import { requestClarificationTool } from '../human/request-clarification';
import { spawnSubagentTool } from '../spawn-subagent';
import { skillListTool } from '../skill/list';
import { skillLoadTool } from '../skill/load';
import { skillUseTool } from '../skill/use';
import { fileDeleteTool } from '../file/delete';
import { mcpCallToolTool } from '../mcp/call-tool';
import { mcpConnectServerTool } from '../mcp/connect-server';
import { mcpListPromptsTool } from '../mcp/list-prompts';
import { mcpListResourcesTool } from '../mcp/list-resources';
import { mcpListServersTool } from '../mcp/list-servers';
import { mcpListToolsTool } from '../mcp/list-tools';
import { mcpLoadPromptTool } from '../mcp/load-prompt';
import { mcpLoadToolTool } from '../mcp/load-tool';
import { mcpReadResourceTool } from '../mcp/read-resource';
import { mcpRefreshServerTool } from '../mcp/refresh-server';

export type FileToolOptions = {
	workspaceDir: string;
	sessionId?: string;
	signal?: AbortSignal;
	services?: Partial<FridayServices>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LegacyFileTool = LegacyAgentTool<any, any>;

const FILE_TOOLS: readonly LegacyFileTool[] = [
	fileReadTool,
	fileEditTool,
	directoryListTool,
	searchFilesTool,
	execTool,
	fileWriteTool,
	fileDeleteTool,
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
	skillListTool,
	skillLoadTool,
	skillUseTool,
	mcpListServersTool,
	mcpConnectServerTool,
	mcpRefreshServerTool,
	mcpListToolsTool,
	mcpLoadToolTool,
	mcpCallToolTool,
	mcpListResourcesTool,
	mcpReadResourceTool,
	mcpListPromptsTool,
	mcpLoadPromptTool,
] as const;

export function createFileTools(options: FileToolOptions): AgentTool[] {
	const context = createFileToolContext(options);
	return FILE_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

export function createReadTool(options: FileToolOptions): AgentTool {
	const read = createFileTools(options).find((tool) => tool.name === 'file_read');
	if (!read) throw new Error('file_read tool is not registered');
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
		signal: options.signal,
		services: (options.services ?? {}) as FridayServices,
	};
}
