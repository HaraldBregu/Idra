import {
	cronConfigurationStorePath,
	getCronConfiguration,
	setCronConfiguration,
} from '../settings_store';
import type { PersistedCronState } from './tasks_types';

export const cronStorePath = cronConfigurationStorePath;

export function getCronState(): PersistedCronState {
	return getCronConfiguration();
}

export function setCronState(value: PersistedCronState): void {
	setCronConfiguration(value);
}
