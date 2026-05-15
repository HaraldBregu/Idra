import type { UserDataDirectoryServicePort } from '../user-data';

export interface WorkspaceServiceOptions {
	workspaceName?: string;
	rootPath?: string;
	userDataDirectory?: UserDataDirectoryServicePort;
}

export interface WriteFileOptions {
	encoding?: BufferEncoding;
}

export interface ReadFileOptions {
	encoding?: BufferEncoding;
}
