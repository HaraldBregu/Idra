import type { AgentDataDirectoryServicePort } from '../storage';
import type { WorkspaceContextFile } from './files';

export interface WorkspaceServiceOptions {
	workspaceName?: string;
	rootPath?: string;
	agentDataDirectory?: AgentDataDirectoryServicePort;
	contextHooks?: WorkspaceContextHook[];
}

export interface WriteFileOptions {
	encoding?: BufferEncoding;
}

export interface ReadFileOptions {
	encoding?: BufferEncoding;
}

export type WorkspaceContextHook = (input: {
	workspaceRoot: string;
	files: WorkspaceContextFile[];
}) => WorkspaceContextFile[] | Promise<WorkspaceContextFile[]>;
