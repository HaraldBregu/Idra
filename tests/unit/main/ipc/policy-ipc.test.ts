import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { PolicyIpc } from '../../../../src/main/ipc/policy-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { PolicyChannels } from '../../../../src/shared/ipc-channels';
import type { PolicyConfig } from '../../../../src/shared/policy';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

describe('PolicyIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('forwards policy reads and writes through the policy service', async () => {
		const policy: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [{ path: '/workspace', permissions: ['read'], recursive: true }],
		};
		const service = {
			getPolicy: jest.fn(() => policy),
			setPolicy: jest.fn((next: PolicyConfig) => next),
		};
		const container = {
			get: jest.fn((key: 'policy' | 'logger') =>
				key === 'policy' ? service : { info: jest.fn() }
			),
		} as unknown as MainServiceContainer;

		new PolicyIpc().register(container, new EventBus());

		await expect(registeredHandler(PolicyChannels.get)({})).resolves.toEqual({
			success: true,
			data: policy,
		});
		await expect(registeredHandler(PolicyChannels.set)({}, policy)).resolves.toEqual({
			success: true,
			data: policy,
		});
		expect(service.setPolicy).toHaveBeenCalledWith(policy);
	});
});
