import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerQuery } from './core/gateway';
import { SpeechChannels } from '../../shared/ipc/ipc-channels';
import { getModelId, getProviderId, setModelId, setProviderId, synthesize } from '../models/tts';

export class SpeechIpc implements IpcModule {
	readonly name = 'speech';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(SpeechChannels.synthesize, (request) => synthesize(request));
		registerQuery(SpeechChannels.getProviderId, () => getProviderId());
		registerCommand(SpeechChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(SpeechChannels.getModelId, () => getModelId());
		registerCommand(SpeechChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
