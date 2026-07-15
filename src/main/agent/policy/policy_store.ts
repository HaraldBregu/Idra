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

export function getToolAllowedCommands(toolName: string): string[] {
	return store.get('tools')[toolName]?.allowedCommands ?? [];
}

export function addToolAllowedCommand(toolName: string, command: string): void {
	const tools = { ...store.get('tools') };
	const entry = tools[toolName] ?? { mode: 'ask' as PermissionMode };
	const allowedCommands = entry.allowedCommands ?? [];
	if (allowedCommands.includes(command)) return;
	tools[toolName] = { ...entry, allowedCommands: [...allowedCommands, command] };
	store.set('tools', tools);
}

// ponytail: flat capped array; aggregate per-tool counts if the log ever needs stats.
const USAGE_LIMIT = 500;

export function recordToolUse(toolName: string, permission: PermissionMode): void {
	const usage = store.get('usage') ?? [];
	const record: ToolUseRecord = { tool: toolName, permission, at: Date.now() };
	store.set('usage', [...usage, record].slice(-USAGE_LIMIT));
}

export function getToolUsage(): ToolUseRecord[] {
	return store.get('usage') ?? [];
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
	store.store = defaults;
	return getPermissions();
}
