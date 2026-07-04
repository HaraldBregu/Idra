import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { CreatorChannels } from '../../shared/ipc_channels_definitions';
import { createImage, getModelId, getProviderId, setModelId, setProviderId } from '../creator';

export class CreatorIpc implements IpcModule {
	readonly name = 'creator';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(CreatorChannels.createImage, (request) => createImage(request));
		registerQuery(CreatorChannels.getProviderId, () => getProviderId());
		registerCommand(CreatorChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(CreatorChannels.getModelId, () => getModelId());
		registerCommand(CreatorChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
