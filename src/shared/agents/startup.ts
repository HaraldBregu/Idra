export type AgentStartupFileName =
	| 'AGENTS.md'
	| 'SOUL.md'
	| 'IDENTITY.md'
	| 'USER.md'
	| 'HEARTBEAT.md'
	| 'BOOTSTRAP.md'
	| 'MEMORY.md';

export interface AgentStartupFileSummary {
	name: AgentStartupFileName;
	path: string;
	missing: boolean;
	size?: number;
}

export interface AgentStartupFileContent extends AgentStartupFileSummary {
	content?: string;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
}

export type WorkspaceFileName = AgentStartupFileName;
export type WorkspaceFileSummary = AgentStartupFileSummary;
export type WorkspaceFileContent = AgentStartupFileContent;
