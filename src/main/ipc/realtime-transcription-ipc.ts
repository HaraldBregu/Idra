import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapIpcHandler } from './ipc-error-handler';
import { RealtimeTranscriptionChannels } from '../../shared/ipc-channels';
import type {
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import { SpeechToTextService } from '../stt';

export class RealtimeTranscriptionIpc implements IpcModule {
	readonly name = 'realtimeTranscription';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const speechToText = new SpeechToTextService({
			store: container.get('store'),
			logger,
		});

		ipcMain.handle(
			RealtimeTranscriptionChannels.start,
			wrapIpcHandler(
				(
					event: IpcMainInvokeEvent,
					request?: RealtimeTranscriptionStartRequest
				): Promise<RealtimeTranscriptionSession> => {
					return speechToText.start(event.sender, request);
				},
				RealtimeTranscriptionChannels.start
			)
		);

		ipcMain.on(
			RealtimeTranscriptionChannels.appendAudio,
			(event: IpcMainEvent, sessionId: string, audio: string) => {
				speechToText.appendAudio(event.sender, sessionId, audio);
			}
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.finish,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: string): void => {
				speechToText.finish(event.sender, sessionId);
			}, RealtimeTranscriptionChannels.finish)
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.cancel,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: string): void => {
				speechToText.cancel(event.sender, sessionId);
			}, RealtimeTranscriptionChannels.cancel)
		);

		logger.info('RealtimeTranscriptionIpc', `Registered ${this.name} module`);
	}
}
