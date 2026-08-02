import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';

interface EmailSettingsState {
	providerId?: string;
	emailId?: string;
}

const store = new Store<EmailSettingsState>({
	name: 'settings.email',
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: { providerId: undefined, emailId: undefined },
});

export const emailStorePath = store.path;

export function getEmailConfiguration(): EmailSettingsState {
	return store.store;
}

export function saveEmailConfiguration(configuration: EmailSettingsState): void {
	store.store = configuration;
}
