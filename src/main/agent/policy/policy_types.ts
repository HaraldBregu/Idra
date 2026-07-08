export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit', 'exec', 'apply_patch'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
	allowedPaths?: string[];
	allowedCommands?: string[];
}

export interface ToolUseRecord {
	tool: string;
	permission: PermissionMode;
	at: number;
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	tools: Record<string, ToolPermission>;
	usage: ToolUseRecord[];
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'allow',
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
