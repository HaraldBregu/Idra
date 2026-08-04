import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { SmtpSettings } from '../../shared/email_types';

interface SmtpStoreState {
	providers: SmtpSettings[];
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

export function getSmtpSettings(): SmtpSettings | undefined {
	return store.get('providers')[0];
}

export function saveSmtpSettings(settings: SmtpSettings): void {
	store.set('providers', [settings]);
}
