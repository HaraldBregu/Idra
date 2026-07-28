import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event_bus';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import { SttChannels } from '../../shared/ipc_channels_definitions';
import {
	appendRealtimeAudio,
	cancelRealtime,
	finishRealtime,
	getSelection,
	listModels,
	listProviders,
	saveSelection,
	startRealtime,
	transcribe,
} from '../app/models_adapters/stt';
import { getModelId, getProviderId, setModelId, setProviderId } from '../transcribe';

export class SttIpc implements IpcModule {
	readonly name = 'stt';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(SttChannels.getSelection, (mode) => getSelection(mode));
		registerQuery(SttChannels.listProviders, () => listProviders());
		registerQuery(SttChannels.listModels, (providerId) => listModels(providerId));
		registerCommand(SttChannels.saveSelection, (providerId, modelId, mode) =>
			saveSelection(providerId, modelId, mode)
		);
		registerQuery(SttChannels.getProviderId, () => getProviderId());
		registerCommand(SttChannels.setProviderId, (providerId) => setProviderId(providerId));
		registerQuery(SttChannels.getModelId, () => getModelId());
		registerCommand(SttChannels.setModelId, (modelId) => setModelId(modelId));
		registerCommand(SttChannels.transcribe, (request) => transcribe(request));
		registerCommandWithEvent(SttChannels.startRealtime, (event, request) =>
			startRealtime(request, (sttEvent) => {
				event.sender.send(SttChannels.realtimeEvent, sttEvent);
			})
		);
		registerCommand(SttChannels.appendRealtimeAudio, (sessionId, audio) =>
			appendRealtimeAudio(sessionId, audio)
		);
		registerCommand(SttChannels.finishRealtime, (sessionId) => finishRealtime(sessionId));
		registerCommand(SttChannels.cancelRealtime, (sessionId) => cancelRealtime(sessionId));
	}
}
