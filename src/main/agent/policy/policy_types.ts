export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit', 'exec', 'apply_patch'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
	allowedPaths?: string[];
	allowedCommands?: string[];
}

// Per-path override of tool permissions. recursive: false applies only to the
// directory itself; true also covers its subtree. "*" in a list matches every
// tool, and deny wins over ask wins over allow.
export interface PathPermission {
	path: string;
	allow: string[];
	deny: string[];
	ask: string[];
	recursive: boolean;
}

export interface ToolUseRecord {
	tool: string;
	permission: PermissionMode;
	at: number;
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	permissions: PathPermission[];
	tools: Record<string, ToolPermission>;
	usage: ToolUseRecord[];
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'allow',
	permissions: [],
	tools: {
		write: { mode: 'ask' },
		edit: { mode: 'ask' },
		exec: { mode: 'ask' },
		apply_patch: { mode: 'ask' },
	},
	usage: [],
};

export function isPermissionGatedTool(toolName: string): toolName is PermissionGatedTool {
	return (PERMISSION_GATED_TOOLS as readonly string[]).includes(toolName);
}
