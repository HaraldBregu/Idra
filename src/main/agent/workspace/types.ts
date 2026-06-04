import type { AgentDataDirectoryServicePort } from '../storage';

export interface WorkspaceServiceOptions {
	workspaceName?: string;
	rootPath?: string;
	agentDataDirectory?: AgentDataDirectoryServicePort;
}

export interface WriteFileOptions {
	encoding?: BufferEncoding;
}

export interface ReadFileOptions {
	encoding?: BufferEncoding;
}
