import { ipcMain, type IpcMainEvent, type IpcMainInvokeEvent, type WebContents } from 'electron';
import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
import type {
	RealtimeClientEvent,
	RealtimeServerEvent,
} from 'openai/resources/realtime/realtime';
import type { IpcModule } from './ipc-module';
import type { EventBus } from '../core/event-bus';
import type { MainServiceContainer } from '../service-registry';
import { wrapIpcHandler } from './ipc-error-handler';
import { RealtimeTranscriptionChannels } from '../../shared/ipc-channels';
import {
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
	isRealtimeSpeechTranscriberModel,
	type Agent,
} from '../../shared/service';
import type {
	RealtimeTranscriptionEvent,
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';

type WebSocketLike = {
	readyState: number;
	addEventListener: (type: string, listener: (event: { message?: string }) => void) => void;
	removeEventListener: (type: string, listener: (event: { message?: string }) => void) => void;
};

const SOCKET_OPEN = 1;
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 3_000;
const PCM_BYTES_PER_SAMPLE = 2;
const MINIMUM_COMMIT_AUDIO_MS = 100;
const REALTIME_TRANSCRIPTION_SOCKET_MODEL = 'gpt-realtime';
const REALTIME_TRANSCRIPTION_INTENT = 'transcription';
export const MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES =
	(REALTIME_TRANSCRIPTION_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE * MINIMUM_COMMIT_AUDIO_MS) / 1_000;

interface RealtimeTranscriptionRuntime {
	id: string;
	model: string;
	socket: OpenAIRealtimeWebSocket;
	webContents: WebContents;
	audioByteLength: number;
	closeAfterFinal: boolean;
	closeTimer: NodeJS.Timeout | null;
}

function eventMessage(event: unknown): string {
	if (typeof event === 'object' && event !== null) {
		const message = (event as { message?: unknown }).message;
		if (typeof message === 'string' && message.trim()) return message;
	}
	return 'Realtime transcription connection failed.';
}

function normalizeLanguage(language: unknown): string | undefined {
	if (typeof language !== 'string') return undefined;
	const trimmed = language.trim();
	if (!trimmed) return undefined;
	if (!/^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(trimmed)) return undefined;
	return trimmed;
}

function resolveConfiguredSpeechTranscriber(agent: Agent | undefined): string {
	if (!agent) {
		throw new Error('Speech-to-text is not configured. Select OpenAI and GPT Realtime Whisper in Settings.');
	}
	if (agent.provider.id.trim().toLowerCase() !== SPEECH_TRANSCRIBER_PROVIDER_ID) {
		throw new Error('Live dictation currently supports OpenAI speech-to-text only.');
	}

	const model = agent.model.id.trim();
	if (!isRealtimeSpeechTranscriberModel(model)) {
		throw new Error(`Live dictation requires ${REALTIME_SPEECH_TRANSCRIBER_MODEL_ID}.`);
	}
	return model;
}

export function decodedRealtimeTranscriptionAudioByteLength(audio: string): number {
	const trimmed = audio.trim();
	if (!trimmed) return 0;
	return Buffer.byteLength(trimmed, 'base64');
}

export function hasMinimumRealtimeTranscriptionAudio(audioByteLength: number): boolean {
	return audioByteLength >= MINIMUM_REALTIME_TRANSCRIPTION_COMMIT_BYTES;
}

export function isInputAudioBufferTooSmallError(message: string): boolean {
	return /input audio buffer/i.test(message) && /buffer too small/i.test(message);
}

export function useRealtimeTranscriptionIntent(url: URL): void {
	url.searchParams.delete('model');
	url.searchParams.set('intent', REALTIME_TRANSCRIPTION_INTENT);
}

export function createRealtimeTranscriptionSocket(
	client: Pick<OpenAI, 'apiKey' | 'baseURL'>
): OpenAIRealtimeWebSocket {
	return new OpenAIRealtimeWebSocket(
		{ model: REALTIME_TRANSCRIPTION_SOCKET_MODEL, onURL: useRealtimeTranscriptionIntent },
		client
	);
}

export function createRealtimeTranscriptionSessionUpdate(
	model: string,
	request?: RealtimeTranscriptionStartRequest
): RealtimeClientEvent {
	const language = normalizeLanguage(request?.language);
	return {
		type: 'session.update',
		session: {
			type: 'transcription',
			audio: {
				input: {
					format: {
						type: 'audio/pcm',
						rate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
					},
					transcription: {
						model,
						...(language ? { language } : {}),
					},
					turn_detection: null,
				},
			},
		},
	} as RealtimeClientEvent;
}

function waitForSocketOpen(socket: WebSocketLike): Promise<void> {
	if (socket.readyState === SOCKET_OPEN) return Promise.resolve();

	return new Promise((resolve, reject) => {
		let settled = false;
		const timeout = setTimeout(() => {
			done(new Error('Realtime transcription connection timed out.'));
		}, CONNECT_TIMEOUT_MS);

		const cleanup = (): void => {
			clearTimeout(timeout);
			socket.removeEventListener('open', handleOpen);
			socket.removeEventListener('error', handleError);
			socket.removeEventListener('close', handleClose);
		};

		const done = (error?: Error): void => {
			if (settled) return;
			settled = true;
			cleanup();
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		};

		const handleOpen = (): void => done();
		const handleError = (event: { message?: string }): void => done(new Error(eventMessage(event)));
		const handleClose = (): void => done(new Error('Realtime transcription connection closed before it was ready.'));

		socket.addEventListener('open', handleOpen);
		socket.addEventListener('error', handleError);
		socket.addEventListener('close', handleClose);
	});
}

export class RealtimeTranscriptionIpc implements IpcModule {
	readonly name = 'realtimeTranscription';
	private readonly sessions = new Map<string, RealtimeTranscriptionRuntime>();

	register(container: MainServiceContainer, _eventBus: EventBus): void {
		const logger = container.get('logger');
		const store = container.get('store');

		ipcMain.handle(
			RealtimeTranscriptionChannels.start,
			wrapIpcHandler(
				async (
					event: IpcMainInvokeEvent,
					request?: RealtimeTranscriptionStartRequest
				): Promise<RealtimeTranscriptionSession> => {
					const model = resolveConfiguredSpeechTranscriber(store.getSpeechTranscriberService());
					const provider = store.getProviderById(SPEECH_TRANSCRIBER_PROVIDER_ID);
					const apiKey = provider?.apiKey.trim();
					if (!provider || !apiKey) {
						throw new Error('OpenAI API key is not configured for speech-to-text.');
					}

					const client = new OpenAI({ apiKey, baseURL: provider.baseUrl });
					const socket = createRealtimeTranscriptionSocket(client);
					const sessionId = randomUUID();
					const runtime: RealtimeTranscriptionRuntime = {
						id: sessionId,
						model,
						socket,
						webContents: event.sender,
						audioByteLength: 0,
						closeAfterFinal: false,
						closeTimer: null,
					};

					this.sessions.set(sessionId, runtime);
					this.bindSocket(runtime);
					event.sender.once('destroyed', () => this.closeSession(sessionId));

					try {
						await waitForSocketOpen(socket.socket as WebSocketLike);
					} catch (error) {
						this.closeSession(sessionId);
						throw error;
					}

					socket.send(createRealtimeTranscriptionSessionUpdate(model, request));
					this.sendToRenderer(runtime, {
						type: 'started',
						sessionId,
						model,
					});

					logger.info('RealtimeTranscriptionIpc', `Started session "${sessionId}"`);
					return { id: sessionId, model, sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE };
				},
				RealtimeTranscriptionChannels.start
			)
		);

		ipcMain.on(
			RealtimeTranscriptionChannels.appendAudio,
			(event: IpcMainEvent, sessionId: string, audio: string) => {
				const runtime = this.sessions.get(sessionId);
				if (!runtime || runtime.webContents.id !== event.sender.id) return;
				if (typeof audio !== 'string' || audio.length === 0) return;

				const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(audio);
				if (audioByteLength === 0) return;

				runtime.audioByteLength += audioByteLength;
				runtime.socket.send({
					type: 'input_audio_buffer.append',
					audio,
				});
			}
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.finish,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: string): void => {
				const runtime = this.requireSessionForSender(sessionId, event.sender);
				if (!hasMinimumRealtimeTranscriptionAudio(runtime.audioByteLength)) {
					this.closeSession(sessionId);
					return;
				}

				runtime.closeAfterFinal = true;
				runtime.socket.send({ type: 'input_audio_buffer.commit' });
				this.scheduleClose(runtime);
			}, RealtimeTranscriptionChannels.finish)
		);

		ipcMain.handle(
			RealtimeTranscriptionChannels.cancel,
			wrapIpcHandler((event: IpcMainInvokeEvent, sessionId: string): void => {
				this.requireSessionForSender(sessionId, event.sender);
				this.closeSession(sessionId);
			}, RealtimeTranscriptionChannels.cancel)
		);

		logger.info('RealtimeTranscriptionIpc', `Registered ${this.name} module`);
	}

	private bindSocket(runtime: RealtimeTranscriptionRuntime): void {
		runtime.socket.on('event', (event: RealtimeServerEvent) => {
			this.handleServerEvent(runtime, event);
		});
		runtime.socket.on('error', (error) => {
			if (runtime.closeAfterFinal && isInputAudioBufferTooSmallError(error.message)) {
				this.closeSession(runtime.id);
				return;
			}

			this.sendToRenderer(runtime, {
				type: 'error',
				sessionId: runtime.id,
				message: error.message,
			});
		});
		(runtime.socket.socket as WebSocketLike).addEventListener('close', () => {
			this.clearCloseTimer(runtime);
			this.sessions.delete(runtime.id);
			this.sendToRenderer(runtime, { type: 'closed', sessionId: runtime.id });
		});
	}

	private handleServerEvent(
		runtime: RealtimeTranscriptionRuntime,
		event: RealtimeServerEvent
	): void {
		if (event.type === 'conversation.item.input_audio_transcription.delta') {
			const delta = event.delta ?? '';
			if (!delta) return;
			this.sendToRenderer(runtime, {
				type: 'delta',
				sessionId: runtime.id,
				itemId: event.item_id,
				contentIndex: event.content_index ?? 0,
				delta,
			});
			return;
		}

		if (event.type === 'conversation.item.input_audio_transcription.completed') {
			this.sendToRenderer(runtime, {
				type: 'completed',
				sessionId: runtime.id,
				itemId: event.item_id,
				contentIndex: event.content_index,
				transcript: event.transcript,
			});
			if (runtime.closeAfterFinal) this.scheduleClose(runtime, 250);
			return;
		}

		if (event.type === 'conversation.item.input_audio_transcription.failed') {
			this.sendToRenderer(runtime, {
				type: 'error',
				sessionId: runtime.id,
				message: event.error.message || 'Realtime transcription failed.',
			});
			if (runtime.closeAfterFinal) this.scheduleClose(runtime, 250);
			return;
		}

		if (event.type === 'error') {
			if (runtime.closeAfterFinal && isInputAudioBufferTooSmallError(event.error.message)) {
				this.closeSession(runtime.id);
				return;
			}

			this.sendToRenderer(runtime, {
				type: 'error',
				sessionId: runtime.id,
				message: event.error.message || 'Realtime transcription failed.',
			});
		}
	}

	private requireSessionForSender(
		sessionId: string,
		sender: WebContents
	): RealtimeTranscriptionRuntime {
		const runtime = this.sessions.get(sessionId);
		if (!runtime || runtime.webContents.id !== sender.id) {
			throw new Error('Realtime transcription session was not found.');
		}
		return runtime;
	}

	private sendToRenderer(
		runtime: RealtimeTranscriptionRuntime,
		event: RealtimeTranscriptionEvent
	): void {
		if (runtime.webContents.isDestroyed()) return;
		runtime.webContents.send(RealtimeTranscriptionChannels.event, event);
	}

	private scheduleClose(runtime: RealtimeTranscriptionRuntime, delayMs = FINISH_CLOSE_DELAY_MS): void {
		this.clearCloseTimer(runtime);
		runtime.closeTimer = setTimeout(() => this.closeSession(runtime.id), delayMs);
	}

	private clearCloseTimer(runtime: RealtimeTranscriptionRuntime): void {
		if (!runtime.closeTimer) return;
		clearTimeout(runtime.closeTimer);
		runtime.closeTimer = null;
	}

	private closeSession(sessionId: string): void {
		const runtime = this.sessions.get(sessionId);
		if (!runtime) return;
		this.clearCloseTimer(runtime);
		this.sessions.delete(sessionId);
		runtime.socket.close({ code: 1000, reason: 'dictation stopped' });
	}
}
