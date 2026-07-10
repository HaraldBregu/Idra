import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { SoundChannels } from '../../shared/ipc_channels_definitions';
import {
	createSound,
	getModelId,
	getProviderId,
	saveSoundFile,
	setModelId,
	setProviderId,
} from '../sound';

export class SoundIpc implements IpcModule {
	readonly name = 'sound';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(SoundChannels.createSound, async (request) => {
			const result = await createSound(request);
			await saveSoundFile(result);
			return result;
		});
		registerQuery(SoundChannels.getProviderId, () => getProviderId());
		registerCommand(SoundChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(SoundChannels.getModelId, () => getModelId());
		registerCommand(SoundChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
