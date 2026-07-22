import type { EventBus } from '../app/event_bus';
import { listWidgets } from '../widgets/widget_index';
import { WidgetChannels } from '../../shared/ipc_channels_definitions';
import { registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class WidgetsIpc implements IpcModule {
	readonly name = 'widgets';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(WidgetChannels.list, () => listWidgets());
	}
}
