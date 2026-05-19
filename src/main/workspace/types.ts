import type { UserDataDirectoryServicePort } from '../user-data';
import type { WorkspaceContextFile } from './files';

export interface WorkspaceServiceOptions {
	workspaceName?: string;
	rootPath?: string;
	userDataDirectory?: UserDataDirectoryServicePort;
	contextHooks?: WorkspaceContextHook[];
	skipBootstrap?: boolean;
	skipOptionalBootstrapFiles?: string[];
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
