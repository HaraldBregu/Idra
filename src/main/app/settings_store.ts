import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';

export type AppSettingsState = {
	keepAwake: boolean;
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	keepAwake: false,
};

const store = new Store<AppSettingsState>({
	name: APP_SETTINGS_STORE_NAME,
	cwd: path.resolve(userDataLocation(), 'app'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_APP_SETTINGS,
});

export function getKeepAwake(): boolean {
	return store.get('keepAwake');
}

export function setKeepAwake(enabled: boolean): void {
	store.set('keepAwake', enabled);
}
