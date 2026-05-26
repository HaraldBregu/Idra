import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapIpcHandler } from './ipc-error-handler';
import { RealtimeTranscriptionChannels } from '../../shared/ipc-channels';
import type {
	RealtimeTranscriptionSession,
} from '../../shared/realtime-transcription';
import {
	isRealtimeTranscriptionAudioChunk,
	isRealtimeTranscriptionSessionId,
	normalizeRealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Realtime transcription failed.';
}

export class RealtimeTranscriptionIpc implements IpcModule {
	readonly name = 'realtimeTranscription';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const speechToText = container.get('speechToText');

		ipcMain.handle(
			RealtimeTranscriptionChannels.start,
			wrapIpcHandler(
				(
					event: IpcMainInvokeEvent,
					request?: unknown
				): Promise<RealtimeTranscriptionSession> => {
					return speechToText.start(
						event.sender,
						normalizeRealtimeTranscriptionStartRequest(request)
					);
				},
				RealtimeTranscriptionChannels.start
			)
		);

		ipcMain.on(
			RealtimeTranscriptionChannels.appendAudio,
			(event: IpcMainEvent, sessionId: unknown, audio: unknown) => {
				try {
					if (!isRealtimeTranscriptionSessionId(sessionId)) {
						throw new Error('Invalid realtime transcription session id.');
					}
					if (!isRealtimeTranscriptionAudioChunk(audio)) return;
					speechToText.appendAudio(event.sender, sessionId, audio);
				} catch (error) {
					event.sender.send(RealtimeTranscriptionChannels.event, {
						type: 'error',
						...(isRealtimeTranscriptionSessionId(sessionId) ? { sessionId } : {}),
						message: errorMessage(error),
					});
				}
			}
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.finish,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: unknown): void => {
				if (!isRealtimeTranscriptionSessionId(sessionId)) {
					throw new Error('Invalid realtime transcription session id.');
				}
				speechToText.finish(event.sender, sessionId);
			}, RealtimeTranscriptionChannels.finish)
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.cancel,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: unknown): void => {
				if (!isRealtimeTranscriptionSessionId(sessionId)) {
					throw new Error('Invalid realtime transcription session id.');
				}
				speechToText.cancel(event.sender, sessionId);
			}, RealtimeTranscriptionChannels.cancel)
		);

		logger.info('RealtimeTranscriptionIpc', `Registered ${this.name} module`);
	}
}
