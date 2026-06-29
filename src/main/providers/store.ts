import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { Provider, ProviderRecord } from '../../shared/providers/types';

export type ProvidersStore = {
	get store(): unknown;
	set store(value: ProviderRecord);
};

export interface ProviderStoreOptions {
	cwd?: string;
}

export function createProviderStore(options: ProviderStoreOptions = {}): ProvidersStore {
	return new Store<ProviderRecord>({
		name: 'settings',
		cwd: path.join(options.cwd ?? resolveAppDataPath(), 'providers'),
		accessPropertiesByDotNotation: false,
	});
}

export function readProviders(store: ProvidersStore): ProviderRecord {
	const raw = store.store;
	if (!isRecord(raw)) return {};
	const providers: ProviderRecord = {};
	for (const [id, value] of Object.entries(raw)) {
		if (isProvider(value)) providers[id] = value;
	}
	return providers;
}

function resolveAppDataPath(): string {
	try {
		return path.resolve(app.getPath('appData'), app.getName());
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday');
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvider(value: unknown): value is Provider {
	return (
		isRecord(value) &&
		typeof value.name === 'string' &&
		typeof value.apiKey === 'string' &&
		typeof value.baseUrl === 'string'
	);
}
