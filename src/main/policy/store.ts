import path from 'node:path';
import Store from 'electron-store';
import type { PolicyConfig, PolicyEntry, Permission } from '../../shared/policy';

const VALID_PERMISSIONS = new Set<Permission>(['read', 'write', 'create', 'delete']);
const DEFAULT_POLICY_PATHS = ['/workspace', '/agent'];
const DEFAULT_POLICY_PERMISSIONS: Permission[] = ['read', 'write', 'create', 'delete'];

type PolicyStoreSchema = Partial<PolicyConfig> & { policy?: PolicyConfig };

export type PolicyStoreAccessor = {
	read(): unknown;
	write(policy: PolicyConfig): void;
};

export function defaultPolicyConfig(): PolicyConfig {
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

function createPolicyStore(): PolicyStoreAccessor {
	const store = new Store<PolicyStoreSchema>({
		name: 'policy',
		accessPropertiesByDotNotation: false,
	});

	return {
		read(): unknown {
			const root = {
				version: store.get('version'),
				defaultPolicy: store.get('defaultPolicy'),
				paths: store.get('paths'),
			};
			if (
				root.version === undefined &&
				root.defaultPolicy === undefined &&
				root.paths === undefined
			) {
				return store.get('policy');
			}
			return root;
		},
		write(policy: PolicyConfig): void {
			store.set('version', policy.version);
			store.set('defaultPolicy', policy.defaultPolicy);
			store.set('paths', policy.paths);
			store.delete('policy');
		},
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
		? record.permissions.flatMap((permission) => (isPermission(permission) ? [permission] : []))
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
	private readonly store: PolicyStoreAccessor;

	constructor(store: PolicyStoreAccessor = createPolicyStore()) {
		this.store = store;
		if (this.store.read() === undefined) {
			this.store.write(defaultPolicyConfig());
		}
	}

	getPolicy(): PolicyConfig {
		return readPolicy(this.store.read());
	}

	setPolicy(policy: PolicyConfig): PolicyConfig {
		assertSupportedPolicyVersion(policy);
		const normalized = readPolicy(policy);
		this.store.write(normalized);
		return normalized;
	}
}
