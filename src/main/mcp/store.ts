import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { McpServerConfig, McpServerRecord, McpNamedEntry } from '../../shared/mcp/types';

function resolveMcpStorePath(): string {
	try {
		return path.join(app.getPath('userData'), 'mcp');
	} catch {
		const base = process.env.APPDATA ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, 'Friday', 'mcp');
	}
}

export class McpServerStore {
	private readonly store: Store<McpServerRecord>;

	constructor(cwd?: string) {
		this.store = new Store<McpServerRecord>({
			name: 'servers',
			cwd: cwd ?? resolveMcpStorePath(),
			accessPropertiesByDotNotation: false,
			defaults: {},
		});
	}

	list(): McpNamedEntry[] {
		return Object.entries(this.store.store)
			.filter(([, v]) => isValid(v))
			.map(([name, config]) => ({ name, config: config as McpServerConfig }));
	}

	get(name: string): McpServerConfig | undefined {
		const entry = this.store.store[name];
		return isValid(entry) ? (entry as McpServerConfig) : undefined;
	}

	upsert(name: string, config: McpServerConfig): void {
		this.store.store = { ...this.store.store, [name]: config };
	}

	delete(name: string): void {
		const all = { ...this.store.store };
		delete all[name];
		this.store.store = all;
	}
}

function isValid(v: unknown): v is McpServerConfig {
	if (typeof v !== 'object' || v === null) return false;
	const o = v as Record<string, unknown>;
	if (typeof o.command === 'string') return true;
	return (o.type === 'http' || o.type === 'sse') && typeof o.url === 'string';
}
