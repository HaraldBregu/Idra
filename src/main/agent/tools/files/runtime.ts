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
	findTool,
	filesystemCopyTool,
	filesystemCreateTool,
	filesystemDeleteTool,
	filesystemListTool,
	filesystemMoveTool,
	filesystemReadTool,
	filesystemSearchTool,
	filesystemUpdateTool,
	inspectFileTool,
	moveTool,
	readTool,
	writeTool,
} from './tools';

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
	filesystemReadTool,
	filesystemUpdateTool,
	filesystemDeleteTool,
	filesystemListTool,
	filesystemMoveTool,
	filesystemCopyTool,
	filesystemSearchTool,
] as const;

export function createFileTools(options: FileToolOptions): AgentTool[] {
	const context = createFileToolContext(options);
	return FILE_TOOLS.map((tool) => markCoreTool(legacyToolToCanonical(tool, context)));
}

export function createReadTool(options: FileToolOptions): AgentTool {
	const read = createFileTools(options).find((tool) => tool.name === 'read');
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
