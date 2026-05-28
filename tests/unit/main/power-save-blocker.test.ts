import {
	KEEP_AWAKE_POWER_SAVE_BLOCKER_TYPE,
	PowerSaveBlockerService,
	type PowerSaveBlockerAdapter,
} from '../../../src/main/power-save-blocker';

function createAdapter(): PowerSaveBlockerAdapter & {
	readonly active: Set<number>;
	readonly start: jest.Mock<number, Parameters<PowerSaveBlockerAdapter['start']>>;
	readonly stop: jest.Mock<boolean, Parameters<PowerSaveBlockerAdapter['stop']>>;
	readonly isStarted: jest.Mock<boolean, Parameters<PowerSaveBlockerAdapter['isStarted']>>;
} {
	let nextId = 1;
	const active = new Set<number>();
	return {
		active,
		start: jest.fn((type) => {
			expect(type).toBe(KEEP_AWAKE_POWER_SAVE_BLOCKER_TYPE);
			const id = nextId;
			nextId += 1;
			active.add(id);
			return id;
		}),
		stop: jest.fn((id) => active.delete(id)),
		isStarted: jest.fn((id) => active.has(id)),
	};
}

describe('PowerSaveBlockerService', () => {
	it('starts one prevent-app-suspension blocker when enabled repeatedly', () => {
		const adapter = createAdapter();
		const service = new PowerSaveBlockerService(adapter);

		expect(service.setEnabled(true)).toBe(true);
		expect(service.setEnabled(true)).toBe(true);

		expect(adapter.start).toHaveBeenCalledTimes(1);
		expect(adapter.stop).not.toHaveBeenCalled();
	});

	it('stops the active blocker when disabled', () => {
		const adapter = createAdapter();
		const service = new PowerSaveBlockerService(adapter);

		service.setEnabled(true);
		expect(service.setEnabled(false)).toBe(false);

		expect(adapter.stop).toHaveBeenCalledWith(1);
		expect(service.isEnabled()).toBe(false);
	});

	it('starts a new blocker if the previous blocker is no longer active', () => {
		const adapter = createAdapter();
		const service = new PowerSaveBlockerService(adapter);

		service.setEnabled(true);
		adapter.active.clear();

		expect(service.isEnabled()).toBe(false);
		expect(service.setEnabled(true)).toBe(true);

		expect(adapter.start).toHaveBeenCalledTimes(2);
	});

	it('stops the blocker on destroy', () => {
		const adapter = createAdapter();
		const service = new PowerSaveBlockerService(adapter);

		service.setEnabled(true);
		service.destroy();

		expect(adapter.stop).toHaveBeenCalledWith(1);
		expect(service.isEnabled()).toBe(false);
	});
});
