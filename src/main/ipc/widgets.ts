import type { EventBus } from '../app/event_bus';
import type { WindowFactory } from '../app';
import { listWidgets, loadWidget } from '../widgets/widget_index';
import { WidgetChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export interface WidgetsIpcDeps {
	windowFactory: WindowFactory;
}

export class WidgetsIpc implements IpcModule<WidgetsIpcDeps> {
	readonly name = 'widgets';

	register(deps: WidgetsIpcDeps, _eventBus: EventBus): void {
		registerQuery(WidgetChannels.list, () => listWidgets());
		registerCommand(WidgetChannels.open, (widgetId: string) => {
			const widget = listWidgets().find((item) => item.id === widgetId);
			if (!widget) throw new Error(`Widget not found: ${widgetId}`);
			loadWidget(deps.windowFactory, widget);
		});
	}
}
