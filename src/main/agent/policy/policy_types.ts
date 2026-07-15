export type PermissionMode = 'allow' | 'deny' | 'ask';

// The destructive tools that require permission; every other tool (read
// included) is always allowed unless a path or "Tool(pattern)" rule says otherwise.
export const PERMISSION_GATED_TOOLS = ['exec', 'write', 'edit', 'apply_patch'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

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
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'ask',
	defaultPermissions: [],
	permissions: { allow: [], deny: [], ask: [] },
};

export function isPermissionGatedTool(toolName: string): toolName is PermissionGatedTool {
	return (PERMISSION_GATED_TOOLS as readonly string[]).includes(toolName);
}
