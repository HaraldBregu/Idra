import path from 'node:path';
import Store from 'electron-store';
import { app } from 'electron';
import type { Provider, ProviderRecord } from '../../shared/providers/types';

const PROVIDERS_STORE_NAME = 'settings';

const store = new Store<ProviderRecord>({
	name: PROVIDERS_STORE_NAME,
	cwd: path.join(resolveAppDataPath(), 'providers'),
	accessPropertiesByDotNotation: false,
});

export function readProviders(): ProviderRecord {
	const raw = store.store;
	if (!isRecord(raw)) return {};
	const providers: ProviderRecord = {};
	for (const [id, value] of Object.entries(raw)) {
		if (isProvider(value)) providers[id] = value;
	}
	return providers;
}

export function writeProviders(providers: ProviderRecord): void {
	store.store = providers;
}

export function clearProviders(): void {
	store.store = {};
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
