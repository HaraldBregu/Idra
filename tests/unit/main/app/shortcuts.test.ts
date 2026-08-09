import type { BrowserWindow } from 'electron';
import { ShortcutManager } from '../../../../src/main/shortcuts';
import { ShortcutId } from '../../../../src/shared/app_types';
import { AppChannels } from '../../../../src/shared/ipc_channels_definitions';

it('forwards the settings shortcut to the renderer', () => {
	let handler: ((event: Electron.Event, input: Electron.Input) => void) | undefined;
	const preventDefault = jest.fn();
	const send = jest.fn();
	const win = {
		webContents: {
			on: (_event: string, listener: typeof handler) => {
				handler = listener;
			},
			send,
		},
	} as unknown as BrowserWindow;

	new ShortcutManager().attach(win);
	handler?.(
		{ preventDefault } as unknown as Electron.Event,
		{
			type: 'keyDown',
			key: ',',
			control: process.platform !== 'darwin',
			meta: process.platform === 'darwin',
			shift: false,
			alt: false,
			isAutoRepeat: false,
		} as Electron.Input
	);

	expect(preventDefault).toHaveBeenCalledTimes(1);
	expect(send).toHaveBeenCalledWith(AppChannels.shortcut, ShortcutId.openSettings);
});
