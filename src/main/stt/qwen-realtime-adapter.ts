import WebSocket from 'ws';
import {
	QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID,
} from '../../shared/provider-models';
import type {
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../shared/service';
import {
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
} from './audio';
import type {
	SpeechToTextRealtimeAdapter,
	SpeechToTextRealtimeSession,
	SpeechToTextRuntimeConfig,
} from './types';

type QwenRealtimeEvent = Record<string, unknown> & { type?: string };

const QWEN_PROVIDER_ID = 'qwen';
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;
const QWEN_INTL_REALTIME_URL = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime';
const QWEN_CHINA_REALTIME_URL = 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime';
const QWEN_TRANSCRIPTION_INSTRUCTIONS =
	'Transcribe user speech verbatim. Return only transcript text.';

const QWEN_REALTIME_MODELS_BY_CATALOG_ID = {
	[QWEN_OMNI_SPEECH_TO_TEXT_MODEL_ID]: 'qwen3.5-omni-flash-realtime',
	[QWEN_OMNI_FLASH_SPEECH_TO_TEXT_MODEL_ID]: 'qwen3-omni-flash-realtime',
} as const satisfies Readonly<Record<string, string>>;

function providerErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Realtime transcription failed.';
}

function normalizeLanguage(language: unknown): string | undefined {
	if (typeof language !== 'string') return undefined;
	const trimmed = language.trim();
	if (!trimmed) return undefined;
	if (!/^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(trimmed)) return undefined;
	return trimmed;
}

function extractText(value: unknown): string {
	if (typeof value !== 'object' || value === null) return '';
	const event = value as Record<string, unknown>;
	for (const key of ['delta', 'text', 'transcript']) {
		const text = event[key];
		if (typeof text === 'string') return text;
	}
	return '';
}

function extractErrorMessage(event: QwenRealtimeEvent): string {
	const error = event.error;
	if (typeof error === 'string' && error.trim()) return error;
	if (typeof error === 'object' && error !== null) {
		const message = (error as { message?: unknown }).message;
		if (typeof message === 'string' && message.trim()) return message;
	}
	const message = event.message;
	if (typeof message === 'string' && message.trim()) return message;
	return 'Realtime transcription failed.';
}

function socketDataToString(data: WebSocket.RawData): string {
	if (typeof data === 'string') return data;
	if (Buffer.isBuffer(data)) return data.toString('utf8');
	if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
	return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf8');
}

function qwenRealtimeBaseUrl(baseUrl: string | undefined): string {
	if (!baseUrl?.trim()) return QWEN_INTL_REALTIME_URL;

	try {
		const url = new URL(baseUrl);
		if (url.hostname === 'dashscope.aliyuncs.com') return QWEN_CHINA_REALTIME_URL;
		if (url.hostname === 'dashscope-intl.aliyuncs.com') return QWEN_INTL_REALTIME_URL;

		url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
		url.pathname = '/api-ws/v1/realtime';
		url.search = '';
		url.hash = '';
		return url.toString();
	} catch {
		return QWEN_INTL_REALTIME_URL;
	}
}

function waitForSocketOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return Promise.resolve();

	return new Promise((resolve, reject) => {
		let settled = false;
		const timeout = setTimeout(() => {
			done(new Error('Realtime transcription connection timed out.'));
		}, CONNECT_TIMEOUT_MS);

		const cleanup = (): void => {
			clearTimeout(timeout);
			socket.off('open', handleOpen);
			socket.off('error', handleError);
			socket.off('close', handleClose);
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
		const handleError = (error: Error): void => done(error);
		const handleClose = (): void =>
			done(new Error('Realtime transcription connection closed before it was ready.'));

		socket.once('open', handleOpen);
		socket.once('error', handleError);
		socket.once('close', handleClose);
	});
}

export function resolveQwenRealtimeSpeechToTextModel(modelId: string): string | null {
	return QWEN_REALTIME_MODELS_BY_CATALOG_ID[modelId.trim()] ?? null;
}

export function createQwenRealtimeTranscriptionUrl(
	baseUrl: string | undefined,
	modelId: string
): string {
	const upstreamModel = resolveQwenRealtimeSpeechToTextModel(modelId);
	if (!upstreamModel) {
		throw new Error(`Qwen realtime speech-to-text is not available for model "${modelId}".`);
	}

	const url = new URL(qwenRealtimeBaseUrl(baseUrl));
	url.searchParams.set('model', upstreamModel);
	return url.toString();
}

export function createQwenRealtimeTranscriptionSocket(
	url: string,
	apiKey: string
): WebSocket {
	return new WebSocket(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});
}

export function createQwenRealtimeTranscriptionSessionUpdate(
	request?: RealtimeTranscriptionStartRequest
): QwenRealtimeEvent {
	const language = normalizeLanguage(request?.language);
	return {
		type: 'session.update',
		session: {
			modalities: ['text'],
			input_audio_format: 'pcm',
			instructions: language
				? `${QWEN_TRANSCRIPTION_INSTRUCTIONS} Language hint: ${language}.`
				: QWEN_TRANSCRIPTION_INSTRUCTIONS,
			turn_detection: null,
		},
	};
}

export function createQwenRealtimeTranscriptionResponseCreate(): QwenRealtimeEvent {
	return {
		type: 'response.create',
		response: {
			modalities: ['text'],
		},
	};
}

class QwenRealtimeSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private readonly upstreamModel: string;
	private socket: WebSocket | null = null;
	private closeTimer: NodeJS.Timeout | null = null;
	private audioByteLength = 0;
	private itemId: string | null = null;
	private transcript = '';
	private completed = false;
	private closed = false;
	private closeAfterFinal = false;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
		const upstreamModel = resolveQwenRealtimeSpeechToTextModel(this.model);
		if (!upstreamModel) {
			throw new Error(`Qwen realtime speech-to-text is not available for model "${this.model}".`);
		}
		this.upstreamModel = upstreamModel;
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		const url = createQwenRealtimeTranscriptionUrl(
			this.config.provider.baseUrl,
			this.config.model.id
		);
		this.socket = createQwenRealtimeTranscriptionSocket(
			url,
			this.config.provider.apiKey.trim()
		);
		this.bindSocket(this.socket);

		try {
			await waitForSocketOpen(this.socket);
		} catch (error) {
			this.close();
			throw new Error(providerErrorMessage(error));
		}

		this.send(createQwenRealtimeTranscriptionSessionUpdate(this.config.request));
		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const trimmed = audio.trim();
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(trimmed);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		this.send({ type: 'input_audio_buffer.append', audio: trimmed });
	}

	finish(): void {
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.close();
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
		const socket = this.socket;
		if (!socket || socket.readyState === WebSocket.CLOSED) {
			this.markClosed();
			return;
		}

		socket.close(1000, 'dictation stopped');
	}

	private bindSocket(socket: WebSocket): void {
		socket.on('message', (data) => {
			this.handleMessage(data);
		});
		socket.on('error', (error) => {
			this.emitError(providerErrorMessage(error));
		});
		socket.on('close', () => {
			this.markClosed();
		});
	}

	private handleMessage(data: WebSocket.RawData): void {
		let event: QwenRealtimeEvent;
		try {
			event = JSON.parse(socketDataToString(data)) as QwenRealtimeEvent;
		} catch (error) {
			this.emitError(providerErrorMessage(error));
			return;
		}

		if (
			event.type === 'response.text.delta' ||
			event.type === 'response.audio_transcript.delta'
		) {
			const delta = extractText(event);
			if (!delta) return;
			this.transcript += delta;
			this.emit({
				type: 'delta',
				sessionId: this.id,
				itemId: this.ensureItemId(),
				contentIndex: 0,
				delta,
			});
			return;
		}

		if (
			event.type === 'response.text.done' ||
			event.type === 'response.audio_transcript.done'
		) {
			this.completeTranscript(extractText(event) || this.transcript);
			return;
		}

		if (event.type === 'conversation.item.input_audio_transcription.completed') {
			this.completeTranscript(extractText(event) || this.transcript);
			return;
		}

		if (event.type === 'response.done') {
			if (this.transcript) this.completeTranscript(this.transcript);
			this.closeFinishedSession();
			return;
		}

		if (event.type === 'error') {
			this.emitError(extractErrorMessage(event));
			this.closeFinishedSession();
		}
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private emitError(message: string): void {
		this.emit({ type: 'error', sessionId: this.id, message });
	}

	private send(payload: QwenRealtimeEvent): void {
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		socket.send(JSON.stringify(payload), (error) => {
			if (error) this.emitError(providerErrorMessage(error));
		});
	}

	private commitAudioBuffer(): void {
		this.emit({
			type: 'committed',
			sessionId: this.id,
			itemId: this.ensureItemId(),
		});
		this.send({ type: 'input_audio_buffer.commit' });
		this.send(createQwenRealtimeTranscriptionResponseCreate());
	}

	private ensureItemId(): string {
		if (!this.itemId) this.itemId = this.id;
		return this.itemId;
	}

	private completeTranscript(transcript: string): void {
		if (this.completed) return;
		this.completed = true;
		this.emit({
			type: 'completed',
			sessionId: this.id,
			itemId: this.ensureItemId(),
			contentIndex: 0,
			transcript,
		});
		this.closeFinishedSession();
	}

	private closeFinishedSession(): void {
		if (!this.closeAfterFinal) return;
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

	private markClosed(): void {
		if (this.closed) return;
		this.closed = true;
		this.clearCloseTimer();
		this.emit({ type: 'closed', sessionId: this.id });
		this.config.callbacks.closed(this.id);
	}
}

export class QwenRealtimeSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		return (
			providerId.trim().toLowerCase() === QWEN_PROVIDER_ID &&
			resolveQwenRealtimeSpeechToTextModel(modelId) !== null
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const session = new QwenRealtimeSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createQwenRealtimeSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new QwenRealtimeSpeechToTextAdapter();
}
