export type PermissionMode = 'allow' | 'deny' | 'ask';

export const PERMISSION_GATED_TOOLS = ['write', 'edit'] as const;

export type PermissionGatedTool = (typeof PERMISSION_GATED_TOOLS)[number];

export interface ToolPermission {
	mode: PermissionMode;
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
	},
};
