import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { AudioChannels } from '../../shared/ipc_channels_definitions';
import {
	cancelRecording,
	completeRecording,
	listRecordings,
	startRecording,
	stopRecording,
} from '../audio';

export class AudioIpc implements IpcModule {
	readonly name = 'audio';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(AudioChannels.start, (config) => startRecording(config));
		registerCommand(AudioChannels.stop, (id) => stopRecording(id));
		registerCommand(AudioChannels.cancel, (id) => cancelRecording(id));
		registerQuery(AudioChannels.list, () => listRecordings());
		registerCommand(AudioChannels.complete, (result) => completeRecording(result));
	}
}
