import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import { SttChannels } from '../../shared/ipc/ipc-channels';
import { SttService } from '../services/stt-service';

export class SttIpc implements IpcModule {
	readonly name = 'stt';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const stt = container.get(SttService);
		registerQuery(SttChannels.getSelection, () => stt.getSelection());
		registerQuery(SttChannels.getProvider, (providerId) => stt.getProvider(providerId));
		registerQuery(SttChannels.isProviderConfigured, (providerId) =>
			stt.isProviderConfigured(providerId)
		);
		registerQuery(SttChannels.listProviders, () => stt.listProviders());
		registerQuery(SttChannels.listModels, (providerId) => stt.listModels(providerId));
		registerCommand(SttChannels.saveProvider, (providerId, provider) =>
			stt.saveProvider(providerId, provider)
		);
		registerCommand(SttChannels.saveSelection, (providerId, modelId) =>
			stt.saveSelection(providerId, modelId)
		);
		registerCommand(SttChannels.transcribe, (request) => stt.transcribe(request));
		registerCommandWithEvent(SttChannels.startRealtime, (event, request) =>
			stt.startRealtime(request, (sttEvent) => {
				event.sender.send(SttChannels.realtimeEvent, sttEvent);
			})
		);
		registerCommand(SttChannels.appendRealtimeAudio, (sessionId, audio) =>
			stt.appendRealtimeAudio(sessionId, audio)
		);
		registerCommand(SttChannels.finishRealtime, (sessionId) => stt.finishRealtime(sessionId));
		registerCommand(SttChannels.cancelRealtime, (sessionId) => stt.cancelRealtime(sessionId));
	}
}
