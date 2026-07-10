import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { MusicChannels } from '../../shared/ipc_channels_definitions';
import { createMusic, getModelId, getProviderId, setModelId, setProviderId } from '../music';

export class MusicIpc implements IpcModule {
	readonly name = 'music';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(MusicChannels.createMusic, (request) => createMusic(request));
		registerQuery(MusicChannels.getProviderId, () => getProviderId());
		registerCommand(MusicChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(MusicChannels.getModelId, () => getModelId());
		registerCommand(MusicChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
