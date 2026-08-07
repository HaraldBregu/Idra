import { BrowserWindow, dialog } from 'electron';
import type { EventBus } from '../event_bus';
import type { WindowFactory } from '../window_factory';
import { importExtensions, listExtensions, loadExtension } from '../extensions/extension_index';
import { ExtensionChannels } from '../../shared/ipc_channels_definitions';
import type { ExtensionImportResult } from '../../shared/extension_types';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export interface ExtensionsIpcDeps {
	windowFactory: WindowFactory;
}

export class ExtensionsIpc implements IpcModule<ExtensionsIpcDeps> {
	readonly name = 'extensions';

	register({ windowFactory }: ExtensionsIpcDeps, _eventBus: EventBus): void {
		registerQuery(ExtensionChannels.list, () => listExtensions());
		registerCommand(ExtensionChannels.open, (extensionId: string) => {
			const extension = listExtensions().find((item) => item.id === extensionId);
			if (!extension) throw new Error(`Extension not found: ${extensionId}`);
			loadExtension(windowFactory, extension);
		});
		registerCommandWithEvent(
			ExtensionChannels.import,
			async (event): Promise<ExtensionImportResult | undefined> => {
				const window = BrowserWindow.fromWebContents(event.sender);
				const result = await (window
					? dialog.showOpenDialog(window, {
							title: 'Select extension folder(s)',
							properties: ['openDirectory', 'multiSelections'],
					})
					: dialog.showOpenDialog({
							title: 'Select extension folder(s)',
							properties: ['openDirectory', 'multiSelections'],
					}));

				if (result.canceled || result.filePaths.length === 0) return undefined;
				return importExtensions(result.filePaths);
			}
		);
	}
}
