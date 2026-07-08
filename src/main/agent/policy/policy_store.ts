import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import {
	DEFAULT_PERMISSIONS,
	type PermissionMode,
	type PermissionsSchema,
	type ToolPermission,
	type ToolUseRecord,
} from './policy_types';

const POLICY_STORE_NAME = 'policy';

const store = new Store<PermissionsSchema>({
	name: POLICY_STORE_NAME,
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

export function getToolAllowedPaths(toolName: string): string[] {
	return store.get('tools')[toolName]?.allowedPaths ?? [];
}

export function addToolAllowedPath(toolName: string, dirPath: string): void {
	const tools = { ...store.get('tools') };
	const entry = tools[toolName] ?? { mode: 'ask' as PermissionMode };
	const allowedPaths = entry.allowedPaths ?? [];
	if (allowedPaths.includes(dirPath)) return;
	tools[toolName] = { ...entry, allowedPaths: [...allowedPaths, dirPath] };
	store.set('tools', tools);
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
	store.store = DEFAULT_PERMISSIONS;
	return getPermissions();
}
