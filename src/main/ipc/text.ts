import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerQuery } from './core/gateway';
import { TextChannels } from '../../shared/ipc_channels_definitions';
import { generateText, getModelId, getProviderId, setModelId, setProviderId } from '../text';

export class TextIpc implements IpcModule {
	readonly name = 'text';

	register(_deps: void, _eventBus: EventBus): void {
		registerCommand(TextChannels.generateText, (request) => generateText(request));
		registerQuery(TextChannels.getProviderId, () => getProviderId());
		registerCommand(TextChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(TextChannels.getModelId, () => getModelId());
		registerCommand(TextChannels.setModelId, (modelId) => setModelId(modelId));
	}
}
