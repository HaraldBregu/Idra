import {
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
	type AgentStartupFilesServicePort,
	type WorkspaceContextFile,
} from '../context/startup';

export interface AgentStartupContextInput {
	agentId: string;
	sessionId: string;
	lightContext?: boolean;
	startup: AgentStartupFilesServicePort;
}

export interface AgentStartupContext {
	primarySession: boolean;
	bootstrapPending: boolean;
	startupFiles: WorkspaceContextFile[];
}

export async function resolveAgentStartupContext(input: AgentStartupContextInput): Promise<AgentStartupContext> {
	const primarySession = input.sessionId === input.agentId;
	const rawStartupFiles = input.lightContext
		? []
		: await input.startup.loadContextFiles(input.agentId).catch(() => []);
	const bootstrapPending = !input.lightContext && primarySession
		&& await input.startup.isBootstrapPending(input.agentId).catch(() => false);
	return {
		primarySession,
		bootstrapPending,
		startupFiles: startupFilesForSession(rawStartupFiles, primarySession, bootstrapPending),
	};
}

function startupFilesForSession(files: WorkspaceContextFile[], primarySession: boolean, bootstrapPending: boolean): WorkspaceContextFile[] {
	return files.filter((file) => {
		if (file.name === DEFAULT_BOOTSTRAP_FILENAME) return primarySession && bootstrapPending;
		if (file.name === DEFAULT_MEMORY_FILENAME) return primarySession;
		return true;
	});
}
