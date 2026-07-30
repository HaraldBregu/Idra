import type { EventBus } from '../app/event_bus';
import type { WindowFactory } from '../app';
import { listExtensions, loadExtension } from '../extensions/extension_index';
import { ExtensionChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';
import type { PluginRepository } from '../plugin';

export interface ExtensionsIpcDeps {
	windowFactory: WindowFactory;
	pluginRepository: PluginRepository;
}

export class ExtensionsIpc implements IpcModule<ExtensionsIpcDeps> {
	readonly name = 'extensions';

	register({ windowFactory, pluginRepository }: ExtensionsIpcDeps, _eventBus: EventBus): void {
		registerQuery(ExtensionChannels.list, () => listExtensions(undefined, pluginRepository));
		registerCommand(ExtensionChannels.open, (extensionId: string) => {
			const extension = listExtensions(undefined, pluginRepository).find((item) => item.id === extensionId);
			if (!extension) throw new Error(`Extension not found: ${extensionId}`);
			loadExtension(windowFactory, extension, undefined, pluginRepository);
		});
	}
}
