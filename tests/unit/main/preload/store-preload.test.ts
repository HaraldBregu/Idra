import { ipcRenderer } from 'electron';
import { store } from '../../../../src/preload';
import { StoreChannels } from '../../../../src/shared/ipc-channels';
import type { PolicyConfig } from '../../../../src/shared/policy';
import type { PublicProvider } from '../../../../src/shared/providers';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

describe('store preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
	});

	it('invokes store API methods through typed IPC channels', async () => {
		const providers: PublicProvider[] = [
			{ id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
		];
		const policy: PolicyConfig = {
			version: 1,
			defaultPolicy: 'deny',
			paths: [{ path: '/workspace', permissions: ['read'], recursive: true }],
		};

		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: providers })
			.mockResolvedValueOnce({ success: true, data: policy })
			.mockResolvedValueOnce({ success: true, data: policy });

		await expect(store.getProviders()).resolves.toEqual(providers);
		await expect(store.getPolicy()).resolves.toEqual(policy);
		await expect(store.setPolicy(policy)).resolves.toEqual(policy);

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(1, StoreChannels.getProviders);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, StoreChannels.getPolicy);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, StoreChannels.setPolicy, policy);
	});
});
