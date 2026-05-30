import { ipcRenderer } from 'electron';
import { store } from '../../../../src/preload';
import { StoreChannels } from '../../../../src/shared/ipc-channels';
import type { PublicProvider } from '../../../../src/shared/providers';
import type { Model } from '../../../../src/shared/agents/service';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('store preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
	});

	it('invokes store API methods through typed IPC channels', async () => {
		const providers: PublicProvider[] = [
			{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
		];
		const model: Model = { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' };

		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: providers })
			.mockResolvedValueOnce({ success: true, data: true })
			.mockResolvedValueOnce({ success: true })
			.mockResolvedValueOnce({ success: true, data: true })
			.mockResolvedValueOnce({ success: true, data: true })
			.mockResolvedValueOnce({ success: true, data: true })
			.mockResolvedValueOnce({ success: true, data: true });

		await expect(store.getProviders()).resolves.toEqual(providers);
		await expect(store.isProviderApiKeySaved('openai')).resolves.toBe(true);
		await expect(store.setProviderApiKey('openai', 'new-key')).resolves.toBeUndefined();
		await expect(store.setKeepAwakeEnabled(true)).resolves.toBe(true);
		await expect(store.saveAssistantOperator(providers[0], model)).resolves.toBe(true);
		await expect(store.saveAgentService(providers[0], model)).resolves.toBe(true);
		await expect(store.saveSpeechTranscriberService(providers[0], model)).resolves.toBe(true);

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(1, StoreChannels.getProviders);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, StoreChannels.isProviderApiKeySaved, 'openai');
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, StoreChannels.setProviderApiKey, 'openai', 'new-key');
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(4, StoreChannels.setKeepAwakeEnabled, true);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(5, StoreChannels.saveAssistantOperator, providers[0], model);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(6, StoreChannels.saveAgentService, providers[0], model);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(7, StoreChannels.saveSpeechTranscriberService, providers[0], model);
	});

});
