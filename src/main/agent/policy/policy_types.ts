export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit', 'exec', 'apply_patch'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
	allowedPaths?: string[];
	allowedCommands?: string[];
}

// A set of tools: the string "*" for every tool, or a list of tool names (which
// may itself contain "*").
export type ToolSelector = '*' | string[];

// Per-path override of tool permissions. recursive: false applies only to the
// directory itself; true also covers its subtree. deny wins over ask wins over
// allow.
export interface PathPermission {
	path: string;
	allow: ToolSelector;
	deny: ToolSelector;
	ask: ToolSelector;
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
