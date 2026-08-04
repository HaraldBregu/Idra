import path from 'node:path';
import { existsSync } from 'node:fs';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { SmtpSettings } from '../../shared/email_types';

interface EmailSettingsState {
	smtp?: SmtpSettings;
}

const settingsDirectory = path.resolve(userDataLocation(), 'settings');
const emailStorePathname = path.join(settingsDirectory, 'email.json');
const hasEmailStore = existsSync(emailStorePathname);
const DEFAULT_EMAIL_SETTINGS: EmailSettingsState = {};

const store = new Store<EmailSettingsState>({
	name: 'email',
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_EMAIL_SETTINGS,
});

if (!hasEmailStore) store.store = DEFAULT_EMAIL_SETTINGS;

export const emailStorePath = store.path;

export function getSmtpSettings(): SmtpSettings | undefined {
	return store.store.smtp;
}

export function saveSmtpSettings(settings: SmtpSettings): void {
	store.set('smtp', settings);
}
