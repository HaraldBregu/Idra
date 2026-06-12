import type { IpcModule } from './core/module';
import type { EventBus } from '../services/event-bus';
import type { MainServiceContainer } from '../services/services';
import { registerCommand, registerCommandWithEvent } from './core/gateway';
import { SttChannels } from '../../shared/ipc/ipc-channels';
import { SttService } from '../services/stt-service';

export class SttIpc implements IpcModule {
	readonly name = 'stt';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const stt = container.get(SttService);
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
