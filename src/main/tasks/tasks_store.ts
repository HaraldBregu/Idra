import {
	taskConfigurationStorePath,
	getTaskConfiguration,
	setTaskConfiguration,
} from '../app/settings_store';
import type { PersistedTaskState } from './tasks_types';

export const taskStorePath = taskConfigurationStorePath;

export function getTaskState(): PersistedTaskState {
	return getTaskConfiguration();
}

export function setTaskState(value: PersistedTaskState): void {
	setTaskConfiguration(value);
}
