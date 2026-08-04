import type { EventBus } from '../app/event_bus';
import { getEmailSettings, saveEmailProvider } from '../smtp';
import { EmailChannels } from '../../shared/ipc_channels_definitions';
import { registerCommand, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

export class EmailIpc implements IpcModule {
	readonly name = 'email';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(EmailChannels.getSettings, getEmailSettings);
		registerCommand(EmailChannels.saveProvider, saveEmailProvider);
	}
}
