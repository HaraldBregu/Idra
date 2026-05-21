import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { AppIpc } from '../../../../src/main/ipc/app-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { ProviderChannels } from '../../../../src/shared/ipc-channels';
import type { Provider, PublicProvider } from '../../../../src/shared/providers';

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

function createContainer(
	provider: Provider | undefined,
	storeOverrides: Record<string, unknown> = {}
): MainServiceContainer {
	const services = {
		apps: {},
		logger: {
			getLogDirectory: jest.fn(),
			getRecentLogs: jest.fn(),
			info: jest.fn(),
		},
		powerSaveBlocker: {
			setEnabled: jest.fn(),
		},
		store: {
			getProviderById: jest.fn(() => provider),
			setAgentService: jest.fn(() => true),
			...storeOverrides,
		},
		userDataDirectory: {
			ensureRoot: jest.fn(),
		},
	};

	return {
		get: jest.fn((key: keyof typeof services) => services[key]),
	} as unknown as MainServiceContainer;
}

describe('AppIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns no assistant models for known non-agent providers', async () => {
		const provider: Provider = {
			id: 'elevenlabs',
			name: 'ElevenLabs',
			baseUrl: 'https://api.elevenlabs.io/v1',
			apiKey: 'test-key',
		};
		const publicProvider: PublicProvider = {
			id: provider.id,
			name: provider.name,
			baseUrl: provider.baseUrl,
		};

		new AppIpc().register(createContainer(provider), new EventBus());

		await expect(registeredHandler(ProviderChannels.getModels)({}, publicProvider)).resolves.toEqual({
			success: true,
			data: [],
		});
	});

	it('strips effort when saving non-OpenAI agent service models', async () => {
		const provider: Provider = {
			id: 'deepseek',
			name: 'DeepSeek',
			baseUrl: 'https://api.deepseek.com',
			apiKey: 'test-key',
		};
		const setAgentService = jest.fn(() => true);
		const publicProvider: PublicProvider = {
			id: provider.id,
			name: provider.name,
			baseUrl: provider.baseUrl,
		};

		new AppIpc().register(createContainer(provider, { setAgentService }), new EventBus());

		await expect(
			registeredHandler(ProviderChannels.saveAgentService)({}, publicProvider, {
				id: 'deepseek-v4-pro',
				name: 'DeepSeek V4-Pro',
				effort: 'high',
			})
		).resolves.toEqual({
			success: true,
			data: true,
		});
		expect(setAgentService).toHaveBeenCalledWith('deepseek', {
			id: 'deepseek-v4-pro',
			name: 'DeepSeek V4-Pro',
		});
	});
});
