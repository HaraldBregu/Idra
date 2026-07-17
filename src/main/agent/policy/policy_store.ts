import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import {
	DEFAULT_PERMISSIONS,
	type PathPermission,
	type PermissionMode,
	type PermissionRules,
	type PermissionsSchema,
} from './policy_types';

const POLICY_STORE_NAME = 'policy';

export const AGENT_DIRECTORY = path.resolve(agentLocation());

// The agent's own data folder is allowed for every tool by default.
const defaults: PermissionsSchema = {
	...DEFAULT_PERMISSIONS,
	defaultPermissions: [
		{ path: AGENT_DIRECTORY, allow: '*', deny: [], ask: [], recursive: true },
	],
};

const store = new Store<PermissionsSchema>({
	name: POLICY_STORE_NAME,
	cwd: AGENT_DIRECTORY,
	accessPropertiesByDotNotation: false,
	defaults,
});

export function getPermissions(): PermissionsSchema {
	return { ...store.store, defaultMode: DEFAULT_PERMISSIONS.defaultMode };
}

export function getPermissionRules(): PermissionRules {
	const rules = store.get('permissions');
	// Guard against stale on-disk data from before this field became an object.
	if (!rules || Array.isArray(rules)) return { allow: [], deny: [], ask: [] };
	return { allow: rules.allow ?? [], deny: rules.deny ?? [], ask: rules.ask ?? [] };
}

export function addPermissionRule(bucket: keyof PermissionRules, rule: string): void {
	const rules = getPermissionRules();
	if (rules[bucket].includes(rule)) return;
	store.set('permissions', { ...rules, [bucket]: [...rules[bucket], rule] });
}

export function getPathPermissions(): PathPermission[] {
	return store.get('defaultPermissions') ?? [];
}

export function setPathPermission(entry: PathPermission): void {
	const rest = getPathPermissions().filter((e) => e.path !== entry.path);
	store.set('defaultPermissions', [...rest, entry]);
}

export function removePathPermission(path: string): void {
	store.set(
		'defaultPermissions',
		getPathPermissions().filter((e) => e.path !== path),
	);
}

export function updatePermissions(patch: Partial<PermissionsSchema>): PermissionsSchema {
	const next = { ...getPermissions(), ...patch, defaultMode: DEFAULT_PERMISSIONS.defaultMode };
	store.store = next;
	return next;
}

export function resetPermissions(): PermissionsSchema {
	store.store = defaults;
	return getPermissions();
}
