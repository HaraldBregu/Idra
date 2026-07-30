import type { EventBus } from '../app/event_bus';
import { PluginChannels } from '../../shared/ipc_channels_definitions';
import type { PluginRepository } from '../plugin';
import { installPlugins } from '../plugin/install';
import { pluginSummary } from '../plugin/summary';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export interface PluginsIpcDeps {
	pluginRepository: PluginRepository;
}

export class PluginsIpc implements IpcModule<PluginsIpcDeps> {
	readonly name = 'plugins';

	register({ pluginRepository }: PluginsIpcDeps, _eventBus: EventBus): void {
		registerQuery(PluginChannels.list, () => pluginRepository.list().map(pluginSummary));
		registerCommand(PluginChannels.install, () => installPlugins(pluginRepository));
	}
}
