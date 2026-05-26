import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapIpcHandler } from './ipc-error-handler';
import { SpeechToTextChannels } from '../../shared/ipc-channels';
import {
	isSpeechToTextAudioChunk,
	isSpeechToTextSessionId,
	normalizeSpeechToTextDictationStartRequest,
	normalizeSpeechToTextTranscribeRequest,
} from '../../shared/speech-to-text';

function errorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Speech-to-text failed.';
}

export class SpeechToTextIpc implements IpcModule {
	readonly name = 'speechToText';

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const speechToText = container.get('speechToText');

		ipcMain.handle(
			SpeechToTextChannels.transcribe,
			wrapIpcHandler((_: IpcMainInvokeEvent, request: unknown) => {
				return speechToText.transcribe(normalizeSpeechToTextTranscribeRequest(request));
			}, SpeechToTextChannels.transcribe)
		);

		ipcMain.handle(
			SpeechToTextChannels.startDictation,
			wrapIpcHandler((event: IpcMainInvokeEvent, request?: unknown) => {
				return speechToText.start(
					event.sender,
					normalizeSpeechToTextDictationStartRequest(request),
					{ eventChannel: SpeechToTextChannels.event }
				);
			}, SpeechToTextChannels.startDictation)
		);

		ipcMain.on(
			SpeechToTextChannels.appendAudio,
			(event: IpcMainEvent, sessionId: unknown, audio: unknown) => {
				try {
					if (!isSpeechToTextSessionId(sessionId)) {
						throw new Error('Invalid speech-to-text session id.');
					}
					if (!isSpeechToTextAudioChunk(audio)) return;
					speechToText.appendAudio(event.sender, sessionId, audio);
				} catch (error) {
					event.sender.send(SpeechToTextChannels.event, {
						type: 'error',
						...(isSpeechToTextSessionId(sessionId) ? { sessionId } : {}),
						message: errorMessage(error),
					});
				}
			}
		);

		ipcMain.handle(
			SpeechToTextChannels.finishDictation,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: unknown): void => {
				if (!isSpeechToTextSessionId(sessionId)) {
					throw new Error('Invalid speech-to-text session id.');
				}
				speechToText.finish(event.sender, sessionId);
			}, SpeechToTextChannels.finishDictation)
		);

		ipcMain.handle(
			SpeechToTextChannels.cancelDictation,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: unknown): void => {
				if (!isSpeechToTextSessionId(sessionId)) {
					throw new Error('Invalid speech-to-text session id.');
				}
				speechToText.cancel(event.sender, sessionId);
			}, SpeechToTextChannels.cancelDictation)
		);

		logger.info('SpeechToTextIpc', `Registered ${this.name} module`);
	}
}
