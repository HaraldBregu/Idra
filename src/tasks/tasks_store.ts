import path from 'node:path';
import { JsonStore } from '../shared/store';
import { userDataLocation } from '../shared/user_data_location';
import { DEFAULT_TASK_STATE, type PersistedTaskState } from './tasks_types';

const store = new JsonStore<PersistedTaskState>({
	name: 'tasks',
	cwd: path.resolve(userDataLocation(), 'settings'),
	defaults: DEFAULT_TASK_STATE,
});

export const taskStorePath = store.path;

export function getTaskState(): PersistedTaskState {
	const state = store.store;
	return { ...state, schedules: [...state.schedules] };
}

export function setTaskState(value: PersistedTaskState): void {
	store.store = value;
}
