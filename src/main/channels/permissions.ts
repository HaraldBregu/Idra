import {
	PERMISSION_TOOLS,
	type PermissionsSchema,
	type ToolPermission,
} from '../agent/permissions/permissions_types';

const allowedTools = Object.fromEntries(
	PERMISSION_TOOLS.map((toolName) => [toolName, { default: 'allow', allow: [], deny: [], ask: [] }])
) as Record<string, ToolPermission>;

export const DEFAULT_CHANNEL_PERMISSIONS: PermissionsSchema = {
	dir: {},
	mode: 'ask',
	...allowedTools,
};
