import type { LoggerService } from '../../observability';
import type { AgentDataDirectoryServicePort } from '../storage';
import type { WORKSPACE_CONTEXT_FILE_NAMES } from './common';

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

export type WorkspaceFileName = (typeof WORKSPACE_CONTEXT_FILE_NAMES)[number];

export type WorkspaceContextFile = {
	name: WorkspaceFileName;
	path: string;
	content?: string;
	missing: boolean;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
};

export type WorkspaceFileSummary = {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
};

export type EnsureWorkspaceOptions = {
	initializeGit?: boolean;
};

export type BootstrapMode = 'none' | 'limited' | 'full';

export interface AgentStartupFilesServiceOptions {
	rootPath?: string;
	logger?: Pick<LoggerService, 'debug' | 'warn'>;
}

export interface AgentStartupFilesServicePort {
	getRootPath(agentId: string): string;
	ensureReady(agentId: string): Promise<void>;
	isBootstrapPending(agentId: string): Promise<boolean>;
	loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]>;
	listFiles(agentId: string): Promise<WorkspaceFileSummary[]>;
	readFile(agentId: string, name: string): Promise<WorkspaceContextFile>;
	writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile>;
	completeBootstrap(agentId: string): Promise<WorkspaceContextFile>;
}

export interface AgentWorkspaceServiceOptions {
	rootPath?: string;
	agentDataDirectory?: AgentDataDirectoryServicePort;
	logger?: LoggerService;
	startupFiles?: AgentStartupFilesServicePort;
}
