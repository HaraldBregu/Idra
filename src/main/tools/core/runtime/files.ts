import type { AgentTool } from '../common';
import { markCoreTool } from '../common';
import type { AgentTool as LegacyAgentTool, FridayServices, ToolContext } from '../tool';
import { legacyToolToCanonical } from './bridge';
import { directoryListTool } from '../../base/list';
import { fileEditTool } from '../../base/edit';
import { fileReadTool } from '../../base/read';
import { bashTool } from '../../base/exec';
import { searchFilesTool } from '../../base/search';
import { fileWriteTool } from '../../base/write';
import { completeTaskTool } from '../../state/todo/complete';
import { listTodosTool } from '../../state/todo/list';
import { readScratchTool } from '../../state/scratch/read';
import { updateTodoTool } from '../../state/todo/update';
import { writeScratchTool } from '../../state/scratch/write';
import { writeTodosTool } from '../../state/todo/write';
import { skillListTool } from '../../skills/skill-list';
import { skillLoadTool } from '../../skills/load-skill';
import { skillUseTool } from '../../skills/use-skill';
import { fileDeleteTool } from '../../base/delete';
import { mcpCallToolTool } from '../../mcp/tool/call';
import { mcpConnectServerTool } from '../../mcp/server/connect';
import { mcpListPromptsTool } from '../../mcp/prompt/list';
import { mcpListResourcesTool } from '../../mcp/resource/list';
import { mcpListServersTool } from '../../mcp/server/list';
import { mcpListToolsTool } from '../../mcp/tool/list';
import { mcpLoadPromptTool } from '../../mcp/prompt/load';
import { mcpLoadToolTool } from '../../mcp/tool/load';
import { mcpReadResourceTool } from '../../mcp/resource/read';
import { mcpRefreshServerTool } from '../../mcp/server/refresh';

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
	bashTool,
	fileWriteTool,
	fileDeleteTool,
	writeTodosTool,
	updateTodoTool,
	listTodosTool,
	completeTaskTool,
	writeScratchTool,
	readScratchTool,
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
