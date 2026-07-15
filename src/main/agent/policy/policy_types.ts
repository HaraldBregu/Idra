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

// Tool-call rules in "Tool(pattern)" form, e.g. "Bash(rm -rf node_modules)".
export interface PermissionRules {
	allow: string[];
	deny: string[];
	ask: string[];
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	defaultPermissions: PathPermission[];
	permissions: PermissionRules;
	tools: Record<string, ToolPermission>;
	usage: ToolUseRecord[];
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'allow',
	defaultPermissions: [],
	permissions: { allow: [], deny: [], ask: [] },
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
