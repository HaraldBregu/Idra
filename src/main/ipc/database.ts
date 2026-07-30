import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { DatabaseChannels } from '../../shared/ipc_channels_definitions';
import { getDatabaseConfiguration, saveDatabaseConfiguration } from '../app/settings_store';

export class DatabaseIpc implements IpcModule {
	readonly name = 'database';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(DatabaseChannels.getConfiguration, () => getDatabaseConfiguration());
		registerCommand(DatabaseChannels.saveConfiguration, (configuration) =>
			saveDatabaseConfiguration(configuration)
		);
	}
}
