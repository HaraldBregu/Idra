import { powerSaveBlocker, type PowerSaveBlocker as ElectronPowerSaveBlocker } from 'electron';

export type KeepAwakePowerSaveBlockerType = Parameters<ElectronPowerSaveBlocker['start']>[0];

export const KEEP_AWAKE_POWER_SAVE_BLOCKER_TYPE: KeepAwakePowerSaveBlockerType =
	'prevent-app-suspension';

export interface PowerSaveBlockerAdapter {
	start(type: KeepAwakePowerSaveBlockerType): number;
	stop(id: number): boolean;
	isStarted(id: number): boolean;
}

export class PowerSaveBlockerService {
	private blockerId: number | null = null;

	constructor(private readonly adapter: PowerSaveBlockerAdapter) {}

	isEnabled(): boolean {
		if (this.blockerId === null) return false;
		const isStarted = this.adapter.isStarted(this.blockerId);
		if (!isStarted) this.blockerId = null;
		return isStarted;
	}

	setEnabled(enabled: boolean): boolean {
		if (!enabled) {
			this.stop();
			return false;
		}

		if (!this.isEnabled()) {
			this.blockerId = this.adapter.start(KEEP_AWAKE_POWER_SAVE_BLOCKER_TYPE);
		}

		return this.isEnabled();
	}

	destroy(): void {
		this.stop();
	}

	private stop(): void {
		if (this.blockerId === null) return;
		const blockerId = this.blockerId;
		this.blockerId = null;
		if (this.adapter.isStarted(blockerId)) {
			this.adapter.stop(blockerId);
		}
	}
}

export function createElectronPowerSaveBlockerService(): PowerSaveBlockerService {
	return new PowerSaveBlockerService(powerSaveBlocker);
}
