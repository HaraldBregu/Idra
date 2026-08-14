import { BrowserWindow, dialog, shell } from 'electron';
import { mkdir } from 'node:fs/promises';
import type { EventBus } from '../event_bus';
import { WikiChannels } from '../../shared/ipc_channels_definitions';
import { cancelWiki, getWikiSettings, getWikiStatus, runWiki, saveWikiSettings } from '../agent/knowledge/wiki';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class WikiIpc implements IpcModule {
	readonly name = 'wiki';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(WikiChannels.getSettings, () => getWikiSettings());
		registerQuery(WikiChannels.getStatus, () => getWikiStatus());
		registerCommand(WikiChannels.saveSettings, (settings) => saveWikiSettings(settings));
		registerCommand(WikiChannels.run, () => runWiki());
		registerCommand(WikiChannels.cancel, () => cancelWiki());
		registerCommand(WikiChannels.pickDirectory, async (kind) => {
			const settings = getWikiSettings();
			const options = {
				defaultPath: kind === 'source' ? settings.sourcePath : settings.targetPath,
				properties: ['openDirectory' as const, 'createDirectory' as const],
			};
			const window = BrowserWindow.getFocusedWindow();
			const result = await (window
				? dialog.showOpenDialog(window, options)
				: dialog.showOpenDialog(options));
			return result.canceled ? undefined : result.filePaths[0];
		});
		registerCommand(WikiChannels.openDirectory, async (kind) => {
			const settings = getWikiSettings();
			const target = kind === 'source' ? settings.sourcePath : settings.targetPath;
			await mkdir(target, { recursive: true });
			const error = await shell.openPath(target);
			if (error) throw new Error(error);
		});
	}
}
