import type { EventBus } from '../event_bus';
import { getSearchSettings, saveSearchEngine, selectSearchEngine } from '../search';
import { SearchChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class SearchIpc implements IpcModule {
	readonly name = 'search';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(SearchChannels.getSettings, getSearchSettings);
		registerCommand(SearchChannels.saveEngine, saveSearchEngine);
		registerCommand(SearchChannels.selectEngine, selectSearchEngine);
	}
}
