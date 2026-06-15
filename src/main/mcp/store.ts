import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { McpServerConfig, McpServerRecord } from '../../shared/mcp/types';

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

	list(): McpServerConfig[] {
		return Object.values(this.store.store).filter(isValid);
	}

	get(id: string): McpServerConfig | undefined {
		const entry = this.store.store[id];
		return isValid(entry) ? entry : undefined;
	}

	upsert(config: McpServerConfig): McpServerConfig {
		const next = { ...config, updatedAt: new Date().toISOString() };
		this.store.store = { ...this.store.store, [config.id]: next };
		return next;
	}

	delete(id: string): void {
		const all = { ...this.store.store };
		delete all[id];
		this.store.store = all;
	}
}

function isValid(v: unknown): v is McpServerConfig {
	return (
		typeof v === 'object' &&
		v !== null &&
		typeof (v as McpServerConfig).id === 'string' &&
		typeof (v as McpServerConfig).transport === 'object'
	);
}
