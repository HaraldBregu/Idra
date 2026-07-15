export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit', 'exec', 'apply_patch'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
	allowedPaths?: string[];
	allowedCommands?: string[];
}

// Overrides the default permission mode for tools acting inside a path.
// recursive: false applies only to the directory itself; true also covers
// its subdirectories.
export interface PathMode {
	path: string;
	mode: PermissionMode;
	recursive: boolean;
}

export interface ToolUseRecord {
	tool: string;
	permission: PermissionMode;
	at: number;
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	pathModes: PathMode[];
	tools: Record<string, ToolPermission>;
	usage: ToolUseRecord[];
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'allow',
	pathModes: [],
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
