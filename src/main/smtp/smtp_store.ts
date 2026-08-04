import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { SmtpProvider } from '../../shared/email_types';

interface SmtpStoreState {
	providers: SmtpProvider[];
	selectedProviderId?: string;
}

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const DEFAULT_SMTP_SETTINGS: SmtpStoreState = { providers: [] };

const store = new Store<SmtpStoreState>({
	name: 'smtp',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_SMTP_SETTINGS,
});

export const smtpStorePath = store.path;

export function getSmtpSettings(): SmtpProvider | undefined {
	const providers = store.get('providers');
	const selectedProviderId = store.get('selectedProviderId');
	return providers.find((provider) => provider.id === selectedProviderId) ?? providers[0];
}

export function getSmtpProviders(): SmtpProvider[] {
	return store.get('providers');
}

export function saveSmtpProvider(provider: SmtpProvider): void {
	store.set('providers', [...getSmtpProviders(), provider]);
	store.set('selectedProviderId', provider.id);
}

export function selectSmtpProvider(providerId: string): void {
	if (!getSmtpProviders().some((provider) => provider.id === providerId)) {
		throw new Error('Unknown SMTP provider.');
	}
	store.set('selectedProviderId', providerId);
}
