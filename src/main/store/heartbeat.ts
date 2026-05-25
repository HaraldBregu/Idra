import type { HeartbeatStoreState } from '../../shared/heartbeat';
import { migrateHeartbeatStoreState as normalizeHeartbeatStoreState } from '../heartbeat/store';
import type { SettingsStoreAccessor } from '../../shared/store';

export class HeartbeatStore {
	private store: SettingsStoreAccessor;

	constructor(store: SettingsStoreAccessor) {
		this.store = store;
	}

	getHeartbeatState(): HeartbeatStoreState {
		return normalizeHeartbeatStoreState(this.store.get('heartbeat'));
	}

	setHeartbeatState(state: HeartbeatStoreState): void {
		this.store.set('heartbeat', normalizeHeartbeatStoreState(state));
	}
}
