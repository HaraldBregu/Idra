import type { PolicyConfig, PolicyEntry, Permission } from '../..w/shared/policy';
import type { SettingsStoreAccessor } from './types';

const VALID_PERMISSIONS = new Set<Permission>(['read', 'write', 'create', 'delete']);

function isPermission(value: unknown): value is Permission {
	return typeof value === 'string' && VALID_PERMISSIONS.has(value as Permission);
}

function readPolicyEntry(value: unknown): PolicyEntry[] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
	const record = value as Record<string, unknown>;
	const entryPath = typeof record.path === 'string' ? record.path : '';
	if (!entryPath || entryPath.includes('..')) return [];
	const permissions = Array.isArray(record.permissions)
		? record.permissions.flatMap((p) => (isPermission(p) ? [p] : []))
		: [];
	const recursive = typeof record.recursive === 'boolean' ? record.recursive : false;
	return [{ path: entryPath, permissions, recursive }];
}

function readPolicy(value: unknown): PolicyConfig {
	const empty: PolicyConfig = { version: 1, defaultPolicy: 'deny', paths: [] };
	if (!value || typeof value !== 'object' || Array.isArray(value)) return empty;
	const record = value as Record<string, unknown>;
	if (record.version !== 1) return empty;
	const defaultPolicy = record.defaultPolicy === 'allow' ? 'allow' : 'deny';
	const paths = Array.isArray(record.paths) ? record.paths.flatMap(readPolicyEntry) : [];
	return { version: 1, defaultPolicy, paths };
}

export class PolicyStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getPolicy(): PolicyConfig {
		return readPolicy(this.store.get('policy'));
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		const normalized = readPolicy(policy);
		this.store.set('policy', normalized);
		return normalized;
	}
}
