import type { LoggerService } from '../../../logger';
import type {
	WorkspaceContextFile,
	WorkspaceFileSummary,
} from '../../../workspace/files';

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
