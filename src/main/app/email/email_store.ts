import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { StoredProvider } from '../../../shared/provider_types';
import { getLegacyEmailProviders, removeLegacyEmailProviders } from '../settings_store';

export interface EmailConfiguration {
	providerId?: string;
	emailId?: string;
}

interface EmailSettingsState extends EmailConfiguration {
	providers: StoredProvider[];
}

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const legacyAppSettingsDirectory = path.resolve(userDataLocation(), 'app');
const emailStorePathname = path.join(settingsDirectory, 'email.json');
const hasEmailStore = existsSync(emailStorePathname);
const DEFAULT_EMAIL_SETTINGS: EmailSettingsState = { providers: [] };

const store = new Store<EmailSettingsState>({
	name: 'email',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_EMAIL_SETTINGS,
});

if (!hasEmailStore) {
	store.store = {
		...DEFAULT_EMAIL_SETTINGS,
		...readLegacyEmailConfiguration(),
		providers: getLegacyEmailProviders(),
	};
}
removeLegacyEmailProviders();

export const emailStorePath = store.path;

export function getEmailConfiguration(): EmailConfiguration {
	const { providerId, emailId } = store.store;
	return { providerId, emailId };
}

export function saveEmailConfiguration(configuration: EmailConfiguration): void {
	store.store = { ...store.store, ...configuration };
}

export function getEmailProviders(): StoredProvider[] {
	return store.get('providers').filter(isStoredProvider);
}

export function setEmailProviders(providers: StoredProvider[]): void {
	store.set('providers', providers.filter(isStoredProvider));
}

function readLegacyEmailConfiguration(): EmailConfiguration {
	const legacyPath = path.join(legacyAppSettingsDirectory, 'settings.email.json');
	if (!existsSync(legacyPath)) return {};
	try {
		const value: unknown = JSON.parse(readFileSync(legacyPath, 'utf8'));
		if (typeof value !== 'object' || value === null) return {};
		const configuration = value as EmailConfiguration;
		return {
			providerId: typeof configuration.providerId === 'string' ? configuration.providerId : undefined,
			emailId: typeof configuration.emailId === 'string' ? configuration.emailId : undefined,
		};
	} catch {
		return {};
	}
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
