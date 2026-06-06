import type { WorkspaceContextFile, WorkspaceFileSummary } from './files';
import { resolveDefaultAgentDataPath } from '../storage';
import { AgentStartupFilesService, type AgentStartupFilesServicePort } from './startup';
import type { AgentWorkspaceServiceOptions } from './types';

export type { AgentWorkspaceServiceOptions } from './types';

/**
 * Per-agent workspace subsystem: the workspace folder path and startup files.
 * Owned and initialized by AgentService (not registered or bootstrapped on its own).
 */
export class AgentWorkspaceService {
	private readonly startupFiles: AgentStartupFilesServicePort;

	constructor(options: AgentWorkspaceServiceOptions = {}) {
		const rootPath =
			options.rootPath ?? options.agentDataDirectory?.resolve() ?? resolveDefaultAgentDataPath();
		this.startupFiles =
			options.startupFiles ?? new AgentStartupFilesService({ rootPath, logger: options.logger });
	}

	getRootPath(agentId: string): string {
		return this.startupFiles.getRootPath(agentId);
	}

	ensureReady(agentId: string): Promise<void> {
		return this.startupFiles.ensureReady(agentId);
	}

	isBootstrapPending(agentId: string): Promise<boolean> {
		return this.startupFiles.isBootstrapPending(agentId);
	}

	loadContextFiles(agentId: string): Promise<WorkspaceContextFile[]> {
		return this.startupFiles.loadContextFiles(agentId);
	}

	listFiles(agentId: string): Promise<WorkspaceFileSummary[]> {
		return this.startupFiles.listFiles(agentId);
	}

	readFile(agentId: string, name: string): Promise<WorkspaceContextFile> {
		return this.startupFiles.readFile(agentId, name);
	}

	writeFile(agentId: string, name: string, content: string): Promise<WorkspaceContextFile> {
		return this.startupFiles.writeFile(agentId, name, content);
	}

	completeBootstrap(agentId: string): Promise<WorkspaceContextFile> {
		return this.startupFiles.completeBootstrap(agentId);
	}
}
