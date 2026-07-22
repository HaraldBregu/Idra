import { contextBridge, ipcRenderer } from 'electron';
import type { AppApi } from '../../../../src/preload/index.d';

describe('widget preload', () => {
	it('exposes only AppApi and invokes its typed IPC channels', async () => {
		const exposed = new Map<string, unknown>();
		jest.mocked(contextBridge.exposeInMainWorld).mockImplementation((name, api) => {
			exposed.set(name, api);
		});
		jest.mocked(ipcRenderer.invoke).mockResolvedValue({ success: true, data: 'dark' });

		await import('../../../../src/preload/widget_index');

		expect([...exposed.keys()]).toEqual(['app']);
		const app = exposed.get('app') as AppApi;
		expect(await app.getTheme()).toBe('dark');
		expect(ipcRenderer.invoke).toHaveBeenCalledWith('app:get-theme');
	});
});
