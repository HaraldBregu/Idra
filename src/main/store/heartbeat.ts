import type { HeartbeatStoreState } from '../../shared/heartbeat';
import { emptyHeartbeatStoreState, migrateHeartbeatStoreState } from '../heartbeat/store';
import type { SettingsStoreAccessor } from '../../shared/store';

export class HeartbeatStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getHeartbeatState(): HeartbeatStoreState {
		return migrateHeartbeatStoreState(this.store.get('heartbeat') ?? emptyHeartbeatStoreState());
	}

	setHeartbeatState(state: HeartbeatStoreState): void {
		this.store.set('heartbeat', migrateHeartbeatStoreState(state));
	}
}
