import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import {
	DEFAULT_PERMISSIONS,
	type PermissionMode,
	type PermissionsSchema,
	type ToolPermission,
} from './permissions_types';

const PERMISSIONS_STORE_NAME = 'permissions';

const store = new Store<PermissionsSchema>({
	name: PERMISSIONS_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_PERMISSIONS,
});

export function getPermissions(): PermissionsSchema {
	return store.store;
}

export function getToolPermission(toolName: string): PermissionMode {
	const tools = store.get('tools');
	const entry = tools[toolName];
	if (entry) return entry.mode;
	return store.get('defaultMode');
}

export function setToolPermission(toolName: string, mode: PermissionMode): void {
	const tools = { ...store.get('tools') };
	const next: ToolPermission = { mode };
	tools[toolName] = next;
	store.set('tools', tools);
}

export function updatePermissions(patch: Partial<PermissionsSchema>): PermissionsSchema {
	const next = { ...getPermissions(), ...patch };
	store.store = next;
	return next;
}

export function resetPermissions(): PermissionsSchema {
	store.store = DEFAULT_PERMISSIONS;
	return getPermissions();
}
