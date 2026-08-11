import { contextAllowsTool, type FileAccessContext } from '../context';
import { AGENT_DIRECTORY, getPermissions } from '../agent_store';
import { registry } from '../tools/core/process';
import { directoryPermissionTargets } from './directory_permission_targets';
import { permissionFor } from './permission_for';
import { toolPermissionTargets } from './tool_permission_targets';
import type { PermissionKind, PermissionMode, PermissionsSchema } from './permissions_types';

const WRITE_TOOLS = new Set([
	'write_file',
	'edit_file',
	'apply_patch',
	'create_image',
	'create_video',
	'create_sound',
]);

export function resolveToolPermission(
	toolName: string,
	args: Record<string, unknown> = {},
	context?: FileAccessContext,
	reuseContext = true,
	fallback: PermissionMode = 'ask',
	configuredPermissions?: PermissionsSchema
): PermissionMode {
	let kind: PermissionKind | undefined;
	if (toolName === 'read_file') kind = 'read';
	else if (WRITE_TOOLS.has(toolName)) kind = 'write';
	else if (toolName === 'exec_command' || toolName === 'process') kind = 'exec';
	if (!kind) return 'allow';

	if (toolName === 'process') {
		const session = typeof args.sessionId === 'string' ? registry.get(args.sessionId) : undefined;
		if (session?.executionMode === 'sandbox') return 'allow';
	}

	const permissions = configuredPermissions ?? getPermissions();
	const targets = kind === 'write'
		? directoryPermissionTargets(toolName, args, AGENT_DIRECTORY)
		: toolPermissionTargets(toolName, args, AGENT_DIRECTORY);
	const decisions = targets.map((target) =>
		permissionFor(permissions[kind], target, kind, args.elevated === true)
	);
	if (decisions.includes('deny')) return 'deny';
	if (targets.length > 0 && decisions.every((decision) => decision === 'allow')) return 'allow';
	if (
		kind === 'read' &&
		reuseContext &&
		contextAllowsTool(context, toolName, args, AGENT_DIRECTORY)
	) return 'allow';
	return fallback;
}
