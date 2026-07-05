export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit', 'exec'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
	allowedPaths?: string[];
	allowedCommands?: string[];
}

export interface PermissionsSchema {
	defaultMode: PermissionMode;
	tools: Record<string, ToolPermission>;
}

export const DEFAULT_PERMISSIONS: PermissionsSchema = {
	defaultMode: 'allow',
	tools: {
		write: { mode: 'ask' },
		edit: { mode: 'ask' },
		exec: { mode: 'ask' },
	},
};

export function isPermissionGatedTool(toolName: string): toolName is PermissionGatedTool {
	return (PERMISSION_GATED_TOOLS as readonly string[]).includes(toolName);
}
