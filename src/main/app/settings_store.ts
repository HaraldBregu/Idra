import path from 'node:path';
import Store from 'electron-store';
import type { ProviderType, ResolvedProvider, StoredProvider } from '../../shared/provider_types';
import { userDataLocation } from '../shared/user_data_location';
import type { AppLanguage, AppTheme } from '../../shared/app_types';

export type AppSettingsState = {
	trayEnabled: boolean;
	keepAwake: boolean;
	language: AppLanguage;
	theme: AppTheme;
	providerId: string | undefined;
	modelId: string | undefined;
	providers: StoredProvider[];
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
	providerId: undefined,
	modelId: undefined,
	providers: [],
};

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});

export function getTrayEnabled(): boolean {
	return store.get('trayEnabled');
}

export function setTrayEnabled(enabled: boolean): void {
	store.set('trayEnabled', enabled);
}

export function getKeepAwake(): boolean {
	return store.get('keepAwake');
}

export function setKeepAwake(enabled: boolean): void {
	store.set('keepAwake', enabled);
}

export function getLanguage(): AppLanguage {
	return store.get('language');
}

export function setLanguage(language: AppLanguage): void {
	store.set('language', language);
}

export function getTheme(): AppTheme {
	return store.get('theme');
}

export function setTheme(theme: AppTheme): void {
	store.set('theme', theme);
}

export function listProviders(type?: ProviderType): StoredProvider[] {
	const raw = store.get('providers');
	const providers = Array.isArray(raw)
		? raw.filter(isStoredProvider).map(normalizeStoredProvider)
		: [];
	return type ? providers.filter((provider) => provider.type === type) : providers;
}

export function getProvider(id: string): StoredProvider | undefined {
	return listProviders().find((provider) => provider.id === id);
}

export function hasProvider(id: string): boolean {
	return getProvider(id) !== undefined;
}

export function setProvider(provider: StoredProvider): StoredProvider {
	const providers = listProviders();
	const index = providers.findIndex((entry) => entry.id === provider.id);
	if (index === -1) providers.push(provider);
	else providers[index] = provider;
	store.set('providers', providers);
	return provider;
}

export function deleteProvider(id: string): void {
	const providers = listProviders();
	const remaining = providers.filter((provider) => provider.id !== id);
	if (remaining.length === providers.length) return;
	store.set('providers', remaining);
}

export function clearProviders(): void {
	store.set('providers', []);
}

/** The selected provider resolved to the shape model adapters consume. */
export function getResolvedProvider(
	providerId: string | undefined = getProviderId()
): ResolvedProvider | undefined {
	if (!providerId) return undefined;
	const provider = getProvider(providerId);
	if (!provider) return undefined;
	return {
		id: providerId,
		apiKey: provider.apiKey,
		baseURL: provider.baseUrl,
	};
}

function isStoredProvider(value: unknown): value is StoredProvider {
	if (typeof value !== 'object' || value === null) return false;
	const provider = value as Partial<StoredProvider>;
	return (
		typeof provider.id === 'string' &&
		typeof provider.name === 'string' &&
		typeof provider.apiKey === 'string' &&
		typeof provider.baseUrl === 'string'
	);
}

export function getProviderId(): string | undefined {
	return store.get('providerId');
}

export function setProviderId(providerId: string): void {
	store.set('providerId', providerId);
}

export function getModelId(): string | undefined {
	return store.get('modelId');
}

export function setModelId(modelId: string): void {
	store.set('modelId', modelId);
}
