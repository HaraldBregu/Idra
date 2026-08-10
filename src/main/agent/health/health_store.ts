import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import { DEFAULT_HEALTH_SETTINGS, type HealthSettings } from './health_types';
import { getPermissions } from '../agent_store';
import { normalizePermissionsSchema } from '../permissions/permissions_normalize_schema';
import {
	DEFAULT_PERMISSIONS,
	type PermissionsSchema,
} from '../permissions/permissions_types';

type HealthStoreState = HealthSettings & { permissions?: PermissionsSchema };

const HEALTH_STORE_NAME = 'health';
const settingsDirectory = path.resolve(userDataLocation(), 'settings');

const store = new Store<HealthStoreState>({
	name: HEALTH_STORE_NAME,
	cwd: settingsDirectory,
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_HEALTH_SETTINGS,
});

export const healthStorePath = store.path;

export function getHealthSettings(): HealthSettings {
	const { permissions: _permissions, ...settings } = store.store;
	return settings;
}

export function updateHealthSettings(patch: Partial<HealthSettings>): HealthSettings {
	const next = { ...getHealthSettings(), ...patch };
	const permissions = store.get('permissions');
	store.store = { ...next, ...(permissions ? { permissions } : {}) };
	return next;
}

export function resetHealthSettings(): HealthSettings {
	const permissions = store.get('permissions');
	store.store = { ...DEFAULT_HEALTH_SETTINGS, ...(permissions ? { permissions } : {}) };
	return getHealthSettings();
}

export function getHealthPermissions(): PermissionsSchema {
	const permissions = normalizePermissionsSchema(
		store.has('permissions') ? store.get('permissions') : getPermissions()
	);
	if (!store.has('permissions')) store.set('permissions', permissions);
	return permissions;
}

export function saveHealthPermissions(value: unknown): PermissionsSchema {
	const permissions = normalizePermissionsSchema(value);
	store.set('permissions', permissions);
	return permissions;
}

export function resetHealthPermissions(): PermissionsSchema {
	return saveHealthPermissions(DEFAULT_PERMISSIONS);
}
