import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { audioRecorder, videoRecorder } from '../recorder';

export class RecorderIpc implements IpcModule {
	readonly name = 'recorder';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(RecorderChannels.audio.start, (config) => audioRecorder.start(config));
		registerCommand(RecorderChannels.audio.stop, (id) => audioRecorder.stop(id));
		registerCommand(RecorderChannels.audio.cancel, (id) => audioRecorder.cancel(id));
		registerQuery(RecorderChannels.audio.list, () => audioRecorder.list());
		registerCommand(RecorderChannels.audio.complete, (result) => audioRecorder.complete(result));
		registerCommand(RecorderChannels.video.start, (config) => videoRecorder.start(config));
		registerCommand(RecorderChannels.video.stop, (id) => videoRecorder.stop(id));
		registerCommand(RecorderChannels.video.cancel, (id) => videoRecorder.cancel(id));
		registerQuery(RecorderChannels.video.list, () => videoRecorder.list());
		registerCommand(RecorderChannels.video.complete, (result) => videoRecorder.complete(result));
	}
}
