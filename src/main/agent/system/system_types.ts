export const AGENT_FILE = 'AGENTS.md' as const;
export const BOOTSTRAP_FILE = 'BOOTSTRAP.md' as const;
export const HEALTH_FILE = 'HEALTH.md' as const;
export const IDENTITY_FILE = 'IDENTITY.md' as const;
export const MEMORY_FILE = 'MEMORY.md' as const;
export const SOUL_FILE = 'SOUL.md' as const;
export const TOOLS_FILE = 'TOOLS.md' as const;
export const USER_FILE = 'USER.md' as const;

export type WorkspaceFile =
	| typeof AGENT_FILE
	| typeof BOOTSTRAP_FILE
	| typeof HEARTBEAT_FILE
	| typeof IDENTITY_FILE
	| typeof MEMORY_FILE
	| typeof SOUL_FILE
	| typeof TOOLS_FILE
	| typeof USER_FILE;

export const WORKSPACE_FILES = [
	AGENT_FILE,
	BOOTSTRAP_FILE,
	HEARTBEAT_FILE,
	IDENTITY_FILE,
	MEMORY_FILE,
	SOUL_FILE,
	TOOLS_FILE,
	USER_FILE,
] as const satisfies readonly WorkspaceFile[];
