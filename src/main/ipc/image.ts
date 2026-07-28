import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { ImageChannels } from '../../shared/ipc_channels_definitions';
import { createImage, getModelId, getProviderId, setModelId, setProviderId } from '../models/image';

export class ImageIpc implements IpcModule {
	readonly name = 'image';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(ImageChannels.createImage, (request) => createImage(request));
		registerQuery(ImageChannels.getProviderId, () => getProviderId());
		registerCommand(ImageChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(ImageChannels.getModelId, () => getModelId());
		registerCommand(ImageChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
