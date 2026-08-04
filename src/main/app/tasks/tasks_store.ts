import {
	cronConfigurationStorePath,
	getTaskConfiguration,
	setTaskConfiguration,
} from '../settings_store';
import type { PersistedTaskState } from './tasks_types';

export const cronStorePath = cronConfigurationStorePath;

export function getTaskState(): PersistedTaskState {
	return getTaskConfiguration();
}

export function setTaskState(value: PersistedTaskState): void {
	setTaskConfiguration(value);
}
