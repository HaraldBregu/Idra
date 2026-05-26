import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { StoreIpc } from '../../../../src/main/ipc/store-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { StoreChannels } from '../../../../src/shared/ipc-channels';
import type { PolicyConfig } from '../../../../src/shared/policy';
import type { Provider } from '../../../../src/shared/providers';
import type { Model } from '../../../../src/shared/agents/service';

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
		const model: Model = { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' };
		const store = {
			getProviders: jest.fn(() => providers),
			upsertProvider: jest.fn(),
			getProviderById: jest.fn(() => providers[0]),
			getKeepAwakeEnabled: jest.fn(() => false),
			setKeepAwakeEnabled: jest.fn((enabled: boolean) => ({ keepAwakeEnabled: enabled })),
			getAssistantOperator: jest.fn(() => undefined),
			setAssistantOperator: jest.fn(() => true),
			getAgentService: jest.fn(() => undefined),
			setAgentService: jest.fn(() => true),
		};
		const policyService = {
			getPolicy: jest.fn(() => policy),
			setPolicy: jest.fn((next: PolicyConfig) => next),
		};
		const powerSaveBlocker = {
			setEnabled: jest.fn((enabled: boolean) => enabled),
		};
		const container = {
			get: jest.fn((key: 'store' | 'policy' | 'logger' | 'powerSaveBlocker') =>
				key === 'store'
					? store
					: key === 'policy'
						? policyService
					: key === 'powerSaveBlocker'
						? powerSaveBlocker
						: { info: jest.fn() }
			),
		} as unknown as MainServiceContainer;

		new StoreIpc().register(container, new EventBus());

		await expect(registeredHandler(StoreChannels.getProviders)({})).resolves.toEqual({
			success: true,
			data: [{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' }],
		});
		await expect(registeredHandler(StoreChannels.isProviderApiKeySaved)({}, 'openai')).resolves.toEqual({
			success: true,
			data: true,
		});
		await expect(registeredHandler(StoreChannels.setProviderApiKey)({}, 'openai', 'new-key')).resolves.toEqual({
			success: true,
		});
		expect(store.upsertProvider).toHaveBeenCalledWith({
			...providers[0],
			capabilities: expect.any(String),
			apiConfiguration: expect.any(Object),
			apiKey: 'new-key',
		});
		await expect(registeredHandler(StoreChannels.setKeepAwakeEnabled)({}, true)).resolves.toEqual({
			success: true,
			data: true,
		});
		expect(powerSaveBlocker.setEnabled).toHaveBeenCalledWith(true);
		expect(store.setKeepAwakeEnabled).toHaveBeenCalledWith(true);
		await expect(registeredHandler(StoreChannels.saveAssistantOperator)({}, publicProvider(providers[0]), model)).resolves.toEqual({
			success: true,
			data: true,
		});
		expect(store.setAssistantOperator).toHaveBeenCalledWith('openai', {
			...model,
			effort: expect.any(String),
		});
		await expect(registeredHandler(StoreChannels.saveAgentService)({}, publicProvider(providers[0]), model)).resolves.toEqual({
			success: true,
			data: true,
		});
		expect(store.setAgentService).toHaveBeenCalledWith('openai', {
			...model,
			effort: expect.any(String),
		});
		await expect(registeredHandler(StoreChannels.getPolicy)({})).resolves.toEqual({
			success: true,
			data: policy,
		});
		await expect(registeredHandler(StoreChannels.setPolicy)({}, policy)).resolves.toEqual({
			success: true,
			data: policy,
		});
		expect(policyService.setPolicy).toHaveBeenCalledWith(policy);
	});
});

function publicProvider(provider: Provider) {
	const { apiKey: _apiKey, ...rest } = provider;
	return rest;
}
