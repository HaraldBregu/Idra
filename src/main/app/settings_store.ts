import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { AppLanguage, AppTheme } from '../../shared/app_types';

export type AppSettingsState = {
	trayEnabled: boolean;
	keepAwake: boolean;
	language: AppLanguage;
	theme: AppTheme;
};

const APP_SETTINGS_STORE_NAME = 'settings';

const DEFAULT_APP_SETTINGS: AppSettingsState = {
	trayEnabled: true,
	keepAwake: false,
	language: 'en',
	theme: 'system',
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
