import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { RecorderChannels } from '../../shared/ipc_channels_definitions';
import { camera, microphone, screen } from '../recorder';

export class RecorderIpc implements IpcModule {
	readonly name = 'recorder';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(RecorderChannels.microphone.start, (config) => microphone.start(config));
		registerCommand(RecorderChannels.microphone.stop, (id) => microphone.stop(id));
		registerCommand(RecorderChannels.microphone.cancel, (id) => microphone.cancel(id));
		registerQuery(RecorderChannels.microphone.list, () => microphone.list());
		registerCommand(RecorderChannels.microphone.complete, (result) => microphone.complete(result));
		registerCommand(RecorderChannels.camera.start, (config) => camera.start(config));
		registerCommand(RecorderChannels.camera.stop, (id) => camera.stop(id));
		registerCommand(RecorderChannels.camera.cancel, (id) => camera.cancel(id));
		registerQuery(RecorderChannels.camera.list, () => camera.list());
		registerCommand(RecorderChannels.camera.complete, (result) => camera.complete(result));
		registerCommand(RecorderChannels.screen.start, (config) => screen.start(config));
		registerCommand(RecorderChannels.screen.stop, (id) => screen.stop(id));
		registerCommand(RecorderChannels.screen.cancel, (id) => screen.cancel(id));
		registerQuery(RecorderChannels.screen.list, () => screen.list());
		registerCommand(RecorderChannels.screen.complete, (result) => screen.complete(result));
	}
}
