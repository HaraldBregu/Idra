import type { EventBus } from '../app/event_bus';
import type { WindowFactory } from '../app';
import { listWidgets, loadWidget } from '../widgets/widget_index';
import { WidgetChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';
import type { PluginRepository } from '../plugin';

export interface WidgetsIpcDeps {
	windowFactory: WindowFactory;
	pluginRepository: PluginRepository;
}

export class WidgetsIpc implements IpcModule<WidgetsIpcDeps> {
	readonly name = 'widgets';

	register({ windowFactory, pluginRepository }: WidgetsIpcDeps, _eventBus: EventBus): void {
		registerQuery(WidgetChannels.list, () => listWidgets(undefined, pluginRepository));
		registerCommand(WidgetChannels.open, (widgetId: string) => {
			const widget = listWidgets(undefined, pluginRepository).find((item) => item.id === widgetId);
			if (!widget) throw new Error(`Widget not found: ${widgetId}`);
			loadWidget(windowFactory, widget, undefined, pluginRepository);
		});
	}
}
