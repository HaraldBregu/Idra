import type { IpcModule } from './core/module';
import type { EventBus } from '../app/event-bus';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import { SttChannels } from '../../shared/ipc/ipc-channels';
import type { SttService } from '../models/stt/service';
import { getModelId, getProviderId, setModelId, setProviderId } from '../voice';

export interface SttIpcDeps {
	stt: SttService;
}

export class SttIpc implements IpcModule<SttIpcDeps> {
	readonly name = 'stt';

	register({ stt }: SttIpcDeps, _eventBus: EventBus): void {
		registerQuery(SttChannels.getSelection, () => stt.getSelection());
		registerQuery(SttChannels.listProviders, () => stt.listProviders());
		registerQuery(SttChannels.listModels, (providerId) => stt.listModels(providerId));
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
