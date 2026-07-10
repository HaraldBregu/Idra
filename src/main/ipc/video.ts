import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { VideoChannels } from '../../shared/ipc_channels_definitions';
import { createVideo, getModelId, getProviderId, setModelId, setProviderId } from '../video';

export class VideoIpc implements IpcModule {
	readonly name = 'video';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(VideoChannels.createVideo, (request) => createVideo(request));
		registerQuery(VideoChannels.getProviderId, () => getProviderId());
		registerCommand(VideoChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(VideoChannels.getModelId, () => getModelId());
		registerCommand(VideoChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
