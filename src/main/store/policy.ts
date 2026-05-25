import path from 'node:path';
import type { PolicyConfig, PolicyEntry, Permission } from '../../shared/policy';
import type { SettingsStoreAccessor } from '../../shared/store';

const VALID_PERMISSIONS = new Set<Permission>(['read', 'write', 'create', 'delete']);
const DEFAULT_POLICY_PATHS = ['/workspace', '/agent'];
const DEFAULT_POLICY_PERMISSIONS: Permission[] = ['read', 'write', 'create', 'delete'];

function defaultPolicyConfig(): PolicyConfig {
	return {
		version: 1,
		defaultPolicy: 'deny',
		paths: DEFAULT_POLICY_PATHS.map((entryPath) => ({
			path: entryPath,
			permissions: [...DEFAULT_POLICY_PERMISSIONS],
			recursive: true,
		})),
	};
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	return value as Record<string, unknown>;
}

function isPermission(value: unknown): value is Permission {
	return typeof value === 'string' && VALID_PERMISSIONS.has(value as Permission);
}

function readPolicyEntry(value: unknown): PolicyEntry[] {
	const record = readRecord(value);
	if (!record) return [];
	const entryPath = typeof record.path === 'string' ? record.path.trim() : '';
	if (!entryPath || !path.isAbsolute(entryPath) || entryPath.includes('..')) return [];
	const permissions = Array.isArray(record.permissions)
		? record.permissions.flatMap((p) => (isPermission(p) ? [p] : []))
		: [];
	const recursive = typeof record.recursive === 'boolean' ? record.recursive : false;
	return [{ path: entryPath, permissions, recursive }];
}

function readPolicy(value: unknown): PolicyConfig {
	const empty = defaultPolicyConfig();
	const record = readRecord(value);
	if (!record) return empty;
	if (record.version !== 1) return empty;
	const defaultPolicy = record.defaultPolicy === 'allow' ? 'allow' : 'deny';
	const paths = Array.isArray(record.paths) ? record.paths.flatMap(readPolicyEntry) : [];
	return { version: 1, defaultPolicy, paths };
}

function assertSupportedPolicyVersion(value: unknown): void {
	const record = readRecord(value);
	if (record?.version !== 1) throw new Error('Unsupported policy version.');
}

export class PolicyStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
		if (this.store.get('policy') === undefined) {
			this.store.set('policy', defaultPolicyConfig());
		}
	}

	getPolicy(): PolicyConfig {
		return readPolicy(this.store.get('policy'));
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		assertSupportedPolicyVersion(policy);
		const normalized = readPolicy(policy);
		this.store.set('policy', normalized);
		return normalized;
	}
}
