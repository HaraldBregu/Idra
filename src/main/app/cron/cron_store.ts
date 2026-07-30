import {
	appSettingsStorePath,
	getCronConfiguration,
	setCronConfiguration,
} from '../settings_store';
import type { PersistedCronState } from './cron_types';

export const cronStorePath = appSettingsStorePath;

export function getCronState(): PersistedCronState {
	return getCronConfiguration();
}

export function setCronState(value: PersistedCronState): void {
	setCronConfiguration(value);
}
