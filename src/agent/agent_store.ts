import path from 'node:path';
import { agentLocation } from '../shared/agent_location';
import { JsonStore } from '../shared/store';
import { userDataLocation } from '../shared/user_data_location';
import { normalizePermissionsSchema } from './permissions/normalize_permissions_schema';
import type {
	PermissionBucket,
	PermissionKind,
	PermissionsSchema,
} from './permissions/permissions_types';
import { withWorkspacePermissions } from './permissions/with_workspace_permissions';

type AgentStoreSchema = {
	permissions: PermissionsSchema;
};

export const AGENT_DIRECTORY = path.resolve(agentLocation());
const workspacePattern = `${AGENT_DIRECTORY.replaceAll(path.sep, '/')}/**`;
const DEFAULT_AGENT_PERMISSIONS: PermissionsSchema = {
	read: { allow: [workspacePattern], deny: [] },
	write: { allow: [workspacePattern], deny: [] },
	exec: { allow: [workspacePattern], deny: [] },
};
const store = new JsonStore<AgentStoreSchema>({
	name: 'agent',
	cwd: path.resolve(userDataLocation(), 'settings'),
	defaults: { permissions: DEFAULT_AGENT_PERMISSIONS },
});

export function getProviderId(): string | undefined {
	return process.env.FRIDAY_PROVIDER_ID?.trim() || undefined;
}

export function getModelId(): string | undefined {
	return process.env.FRIDAY_MODEL_ID?.trim() || undefined;
}

export function getModelOptions(): Record<string, unknown> {
	const value = process.env.FRIDAY_MODEL_OPTIONS?.trim();
	if (!value) return {};
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		throw new Error('FRIDAY_MODEL_OPTIONS must be a JSON object.');
	}
}

export function getPermissions(): PermissionsSchema {
	return withWorkspacePermissions(
		normalizePermissionsSchema(store.get('permissions'), DEFAULT_AGENT_PERMISSIONS),
		workspacePattern
	);
}

export function setPermissions(permissions: PermissionsSchema): PermissionsSchema {
	store.set(
		'permissions',
		withWorkspacePermissions(
			normalizePermissionsSchema(permissions, DEFAULT_AGENT_PERMISSIONS),
			workspacePattern
		)
	);
	return getPermissions();
}

export function addPermissionRule(
	kind: PermissionKind,
	bucket: PermissionBucket,
	rule: string
): void {
	const permissions = getPermissions();
	const permission = permissions[kind];
	if (permission[bucket].includes(rule)) return;
	setPermissions({
		...permissions,
		[kind]: { ...permission, [bucket]: [...permission[bucket], rule] },
	});
}

export function resetPermissions(): PermissionsSchema {
	store.set('permissions', DEFAULT_AGENT_PERMISSIONS);
	return getPermissions();
}
