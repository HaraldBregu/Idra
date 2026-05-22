import OpenAI from 'openai';
import { OpenAIRealtimeWebSocket } from 'openai/realtime/websocket';
import type {
	RealtimeClientEvent,
	RealtimeServerEvent,
} from 'openai/resources/realtime/realtime';
import type {
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import {
	REALTIME_TRANSCRIPTION_SAMPLE_RATE,
	isRealtimeSpeechTranscriberModel,
} from '../../shared/service';
import {
	REALTIME_SPEECH_TRANSCRIBER_MODEL_ID,
	SPEECH_TRANSCRIBER_MODEL_IDS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
} from '../../shared/provider-models';
import {
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
	hasStreamingRealtimeTranscriptionAudio,
} from './audio';
import type {
	SpeechToTextRealtimeAdapter,
	SpeechToTextRealtimeSession,
	SpeechToTextRuntimeConfig,
} from './types';

type WebSocketLike = {
	readyState: number;
	addEventListener: (type: string, listener: (event: { message?: string }) => void) => void;
	removeEventListener: (type: string, listener: (event: { message?: string }) => void) => void;
};

const SOCKET_OPEN = 1;
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;
const REALTIME_TRANSCRIPTION_SOCKET_MODEL = 'gpt-realtime';
const REALTIME_TRANSCRIPTION_INTENT = 'transcription';
const REALTIME_TRANSCRIPTION_DELAY = 'high';

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

export function resolveOpenAIRealtimeTranscriptionModel(model: string): string | null {
	const normalizedModel = model.trim();
	if (isRealtimeSpeechTranscriberModel(normalizedModel)) return normalizedModel;
	if ((LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(normalizedModel)) {
		return REALTIME_SPEECH_TRANSCRIBER_MODEL_ID;
	}
	return null;
}

export function createRealtimeTranscriptionSessionUpdate(
	model: string,
	request?: RealtimeTranscriptionStartRequest
): RealtimeClientEvent {
	const language = normalizeLanguage(request?.language);
	const transcriptionModel = resolveOpenAIRealtimeTranscriptionModel(model) ?? model.trim();
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
						model: transcriptionModel,
						delay: REALTIME_TRANSCRIPTION_DELAY,
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

class OpenAIRealtimeSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private readonly socket: OpenAIRealtimeWebSocket;
	private audioByteLength = 0;
	private pendingCommitCount = 0;
	private readonly pendingItemIds = new Set<string>();
	private closeAfterFinal = false;
	private closeTimer: NodeJS.Timeout | null = null;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model =
			resolveOpenAIRealtimeTranscriptionModel(config.model.id) ?? config.model.id;
		const client = new OpenAI({
			apiKey: config.provider.apiKey.trim(),
			baseURL: config.provider.baseUrl,
		});
		this.socket = createRealtimeTranscriptionSocket(client);
		this.bindSocket();
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		try {
			await waitForSocketOpen(this.socket.socket as WebSocketLike);
		} catch (error) {
			this.close();
			throw error;
		}

		this.socket.send(createRealtimeTranscriptionSessionUpdate(this.model, this.config.request));
		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(audio);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		this.socket.send({
			type: 'input_audio_buffer.append',
			audio,
		});
		if (hasStreamingRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.commitAudioBuffer();
		}
	}

	finish(): void {
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.audioByteLength = 0;
			this.closeAfterFinal = true;
			if (this.hasPendingTranscription()) {
				this.scheduleClose();
			} else {
				this.close();
			}
			return;
		}

		this.closeAfterFinal = true;
		this.commitAudioBuffer();
		this.scheduleClose();
	}

	cancel(): void {
		this.close();
	}

	close(): void {
		this.clearCloseTimer();
		this.socket.close({ code: 1000, reason: 'dictation stopped' });
	}

	private bindSocket(): void {
		this.socket.on('event', (event: RealtimeServerEvent) => {
			this.handleServerEvent(event);
		});
		this.socket.on('error', (error) => {
			const message = error.error?.message ?? error.message;
			if (this.closeAfterFinal && isInputAudioBufferTooSmallError(message)) {
				this.close();
				return;
			}

			this.emit({
				type: 'error',
				sessionId: this.id,
				message,
			});
		});
		(this.socket.socket as WebSocketLike).addEventListener('close', () => {
			this.clearCloseTimer();
			this.emit({ type: 'closed', sessionId: this.id });
			this.config.callbacks.closed(this.id);
		});
	}

	private handleServerEvent(event: RealtimeServerEvent): void {
		if (event.type === 'conversation.item.input_audio_transcription.delta') {
			const delta = event.delta ?? '';
			if (!delta) return;
			this.emit({
				type: 'delta',
				sessionId: this.id,
				itemId: event.item_id,
				contentIndex: event.content_index ?? 0,
				delta,
			});
			return;
		}

		if (event.type === 'input_audio_buffer.committed') {
			this.pendingCommitCount = Math.max(0, this.pendingCommitCount - 1);
			this.pendingItemIds.add(event.item_id);
			this.emit({
				type: 'committed',
				sessionId: this.id,
				itemId: event.item_id,
			});
			return;
		}

		if (event.type === 'conversation.item.input_audio_transcription.completed') {
			this.pendingItemIds.delete(event.item_id);
			this.emit({
				type: 'completed',
				sessionId: this.id,
				itemId: event.item_id,
				contentIndex: event.content_index,
				transcript: event.transcript,
			});
			this.closeFinishedSession();
			return;
		}

		if (event.type === 'conversation.item.input_audio_transcription.failed') {
			this.pendingItemIds.delete(event.item_id);
			this.emit({
				type: 'error',
				sessionId: this.id,
				message: event.error.message || 'Realtime transcription failed.',
			});
			this.closeFinishedSession();
		}
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private commitAudioBuffer(): void {
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) return;
		this.audioByteLength = 0;
		this.pendingCommitCount += 1;
		this.socket.send({ type: 'input_audio_buffer.commit' });
	}

	private hasPendingTranscription(): boolean {
		return this.pendingCommitCount > 0 || this.pendingItemIds.size > 0;
	}

	private closeFinishedSession(): void {
		if (!this.closeAfterFinal || this.hasPendingTranscription()) return;
		this.scheduleClose(250);
	}

	private scheduleClose(delayMs = FINISH_CLOSE_DELAY_MS): void {
		this.clearCloseTimer();
		this.closeTimer = setTimeout(() => this.close(), delayMs);
	}

	private clearCloseTimer(): void {
		if (!this.closeTimer) return;
		clearTimeout(this.closeTimer);
		this.closeTimer = null;
	}
}

export class OpenAIRealtimeSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		return (
			providerId.trim().toLowerCase() === SPEECH_TRANSCRIBER_PROVIDER_ID &&
			resolveOpenAIRealtimeTranscriptionModel(modelId) !== null
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = resolveOpenAIRealtimeTranscriptionModel(config.model.id);
		if (!model) {
			throw new Error(
				`OpenAI realtime speech-to-text requires one of: ${SPEECH_TRANSCRIBER_MODEL_IDS.join(', ')}.`
			);
		}
		const session = new OpenAIRealtimeSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createOpenAIRealtimeSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new OpenAIRealtimeSpeechToTextAdapter();
}
