import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { StoreIpc } from '../../../../src/main/ipc/store-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { StoreChannels } from '../../../../src/shared/ipc-channels';
import type { PolicyConfig } from '../../../../src/shared/policy';
import type { Provider } from '../../../../src/shared/providers';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

describe('StoreIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('exposes store providers without API keys and forwards policy reads and writes', async () => {
		const providers: Provider[] = [
			{
				id: 'openai',
				name: 'OpenAI',
				baseUrl: 'https://api.openai.com/v1',
				apiKey: 'secret-key',
			},
		];
		const policy: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [{ path: '/workspace', permissions: ['read'], recursive: true }],
		};
		const store = {
			getProviders: jest.fn(() => providers),
			getPolicy: jest.fn(() => policy),
			setPolicy: jest.fn((next: PolicyConfig) => next),
		};
		const container = {
			get: jest.fn((key: 'store' | 'logger') =>
				key === 'store' ? store : { info: jest.fn() }
			),
		} as unknown as MainServiceContainer;

		new StoreIpc().register(container, new EventBus());

		await expect(registeredHandler(StoreChannels.getProviders)({})).resolves.toEqual({
			success: true,
			data: [{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }],
		});
		await expect(registeredHandler(StoreChannels.getPolicy)({})).resolves.toEqual({
			success: true,
			data: policy,
		});
		await expect(registeredHandler(StoreChannels.setPolicy)({}, policy)).resolves.toEqual({
			success: true,
			data: policy,
		});
		expect(store.setPolicy).toHaveBeenCalledWith(policy);
	});
});
