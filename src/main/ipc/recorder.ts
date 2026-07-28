import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { camera, microphone, screen } from '../recorder';
import type { Recorder } from '../recorder';

type Channels = (typeof RecorderChannels)[keyof typeof RecorderChannels];

function registerTrack(channels: Channels, recorder: Recorder): void {
	registerCommand(channels.start, (config) => recorder.start(config));
	registerCommand(channels.stop, (id) => recorder.stop(id));
	registerCommand(channels.cancel, (id) => recorder.cancel(id));
	registerQuery(channels.list, () => recorder.list());
	registerCommand(channels.complete, (result) => recorder.complete(result));
}

export class RecorderIpc implements IpcModule {
	readonly name = 'recorder';

	register(_deps: void, _eventBus: EventBus): void {
		registerTrack(RecorderChannels.microphone, microphone);
		registerTrack(RecorderChannels.camera, camera);
		registerTrack(RecorderChannels.screen, screen);
	}
}
