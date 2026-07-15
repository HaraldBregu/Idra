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

const agentDir = path.resolve(agentLocation());

// The agent's own data folder is allowed for every tool by default.
const defaults: PermissionsSchema = {
	...DEFAULT_PERMISSIONS,
	defaultPermissions: [{ path: agentDir, allow: '*', deny: [], ask: [], recursive: true }],
};

const store = new Store<PermissionsSchema>({
	name: POLICY_STORE_NAME,
	cwd: agentDir,
	accessPropertiesByDotNotation: false,
	defaults,
});

export function getPermissions(): PermissionsSchema {
	return store.store;
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

export function getDefaultMode(): PermissionMode {
	return store.get('defaultMode');
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
	const next = { ...getPermissions(), ...patch };
	store.store = next;
	return next;
}

export function resetPermissions(): PermissionsSchema {
	store.store = defaults;
	return getPermissions();
}
