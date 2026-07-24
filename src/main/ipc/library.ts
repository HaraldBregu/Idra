import type { EventBus } from '../app/event_bus';
import { LibraryChannels } from '../../shared/ipc_channels_definitions';
import { listLibrary } from '../library';
import { registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class LibraryIpc implements IpcModule {
	readonly name = 'library';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(LibraryChannels.list, () => listLibrary());
	}
}
