import path from 'node:path';
import Store from 'electron-store';
import { agentLocation } from '../../shared/agent_location';
import type { PersistedCronState } from './cron_types';

const CRON_STORE_NAME = 'cron';

const store = new Store<PersistedCronState>({
	name: CRON_STORE_NAME,
	cwd: path.resolve(agentLocation()),
	accessPropertiesByDotNotation: false,
	defaults: { schedules: [] },
});

export function getCronState(): PersistedCronState {
	return store.store;
}

export function setCronState(value: PersistedCronState): void {
	store.store = value;
}
