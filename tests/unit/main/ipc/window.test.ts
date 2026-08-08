import { BrowserWindow, ipcMain, Menu } from 'electron';
import type { IpcMainInvokeEvent, MenuItemConstructorOptions } from 'electron';

import type { EventBus } from '../../../../src/main/event_bus';
import { WindowIpc } from '../../../../src/main/ipc/window';
import type { LoggerService } from '../../../../src/main/shared';
import { WindowChannels } from '../../../../src/shared/ipc_channels_definitions';

it('shows a native context menu and returns the selected item id', async () => {
	const fromWebContents = jest.fn(() => ({}));
	Object.assign(BrowserWindow, { fromWebContents });

	(Menu.buildFromTemplate as jest.Mock).mockImplementation(
		(template: MenuItemConstructorOptions[]) => {
			let close: (() => void) | undefined;
			return {
				once: (_event: string, listener: () => void) => {
					close = listener;
				},
				popup: () => {
					template[0].click?.({} as never, {} as never, {} as never);
					close?.();
				},
			};
		}
	);

	new WindowIpc().register(
		{ logger: { info: jest.fn() } as unknown as LoggerService },
		{} as EventBus
	);
	const handler = (ipcMain.handle as jest.Mock).mock.calls.find(
		([channel]) => channel === WindowChannels.showContextMenu
	)?.[1];

	await expect(
		handler({ sender: {} } as IpcMainInvokeEvent, [
			{ id: 'open', label: 'Open' },
			{ type: 'separator' },
		])
	).resolves.toEqual({ success: true, data: 'open' });
	expect(fromWebContents).toHaveBeenCalledTimes(1);
});
