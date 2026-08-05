import type { EventBus } from '../event_bus';
import type { WindowFactory } from '../window_factory';
import { listExtensions, loadExtension } from '../extensions/extension_index';
import { ExtensionChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
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
	}
}
