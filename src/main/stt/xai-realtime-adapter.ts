import { Buffer } from 'node:buffer';
import WebSocket from 'ws';
import {
	XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID,
	XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID,
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

type XaiRealtimeEvent = Record<string, unknown> & { type?: string };

const XAI_PROVIDER_ID = 'xai';
const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1';
const XAI_STT_ENDPOINT = '/stt';
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;
const XAI_LANGUAGE_CODES = new Set([
	'ar',
	'cs',
	'da',
	'nl',
	'en',
	'fil',
	'fr',
	'de',
	'hi',
	'id',
	'it',
	'ja',
	'ko',
	'mk',
	'ms',
	'fa',
	'pl',
	'pt',
	'ro',
	'ru',
	'es',
	'sv',
	'th',
	'tr',
	'vi',
]);

function providerErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Realtime transcription failed.';
}

function stringProperty(value: unknown, key: string): string {
	if (typeof value !== 'object' || value === null) return '';
	const text = (value as Record<string, unknown>)[key];
	return typeof text === 'string' ? text : '';
}

function booleanProperty(value: unknown, key: string): boolean {
	if (typeof value !== 'object' || value === null) return false;
	return (value as Record<string, unknown>)[key] === true;
}

function normalizeXaiLanguageCode(language: unknown): string | undefined {
	if (typeof language !== 'string') return undefined;
	const primary = language.trim().toLowerCase().split(/[-_]/)[0];
	if (!primary || !XAI_LANGUAGE_CODES.has(primary)) return undefined;
	return primary;
}

function appendTranscript(prefix: string, text: string): string {
	const normalizedPrefix = prefix.trim();
	const normalizedText = text.trim();
	if (!normalizedText) return normalizedPrefix;
	if (!normalizedPrefix) return normalizedText;
	if (normalizedText.startsWith(normalizedPrefix)) return normalizedText;
	return `${normalizedPrefix} ${normalizedText}`.trim();
}

function appendXaiSttEndpoint(baseUrl: string | undefined): URL {
	const url = new URL(baseUrl?.trim() || DEFAULT_XAI_BASE_URL);
	const path = url.pathname.replace(/\/+$/, '');
	if (path.endsWith(XAI_STT_ENDPOINT)) {
		url.pathname = path;
		return url;
	}
	if (!path || path === '/') {
		url.pathname = `/v1${XAI_STT_ENDPOINT}`;
		return url;
	}
	url.pathname = `${path}${XAI_STT_ENDPOINT}`;
	return url;
}

function extractTranscriptText(value: unknown): string {
	if (typeof value !== 'object' || value === null) return '';
	const record = value as Record<string, unknown>;
	const text = record.text;
	if (typeof text === 'string') return text;

	const channels = record.channels;
	if (Array.isArray(channels)) {
		return channels.map(extractTranscriptText).filter(Boolean).join('\n');
	}
	return '';
}

function extractResponseError(value: unknown): string {
	if (typeof value === 'string' && value.trim()) return value;
	if (typeof value !== 'object' || value === null) return '';
	const record = value as Record<string, unknown>;
	for (const key of ['message', 'detail', 'error']) {
		const nested = record[key];
		if (typeof nested === 'string' && nested.trim()) return nested;
		if (typeof nested === 'object' && nested !== null) {
			const message = extractResponseError(nested);
			if (message) return message;
		}
	}
	return '';
}

function parseResponseBody(text: string): unknown {
	if (!text.trim()) return null;
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function socketDataToString(data: WebSocket.RawData): string {
	if (typeof data === 'string') return data;
	if (Buffer.isBuffer(data)) return data.toString('utf8');
	if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
	return Buffer.from(data as ArrayBuffer).toString('utf8');
}

export function createXaiSpeechToTextUrl(baseUrl: string | undefined): string {
	const url = appendXaiSttEndpoint(baseUrl);
	url.protocol = url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol;
	url.search = '';
	url.hash = '';
	return url.toString();
}

export function createXaiRealtimeTranscriptionUrl(
	baseUrl: string | undefined,
	request?: RealtimeTranscriptionStartRequest
): string {
	const url = appendXaiSttEndpoint(baseUrl);
	url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
	url.search = '';
	url.hash = '';
	url.searchParams.set('sample_rate', String(REALTIME_TRANSCRIPTION_SAMPLE_RATE));
	url.searchParams.set('encoding', 'pcm');
	url.searchParams.set('interim_results', 'true');

	const language = normalizeXaiLanguageCode(request?.language);
	if (language) url.searchParams.set('language', language);
	return url.toString();
}

export function createXaiRealtimeTranscriptionSocket(
	url: string,
	apiKey: string
): WebSocket {
	return new WebSocket(url, {
		headers: {
			Authorization: `Bearer ${apiKey}`,
		},
	});
}

class XaiBatchSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private readonly audioChunks: Buffer[] = [];
	private audioByteLength = 0;
	private closed = false;
	private finished = false;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const trimmed = audio.trim();
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(trimmed);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		this.audioChunks.push(Buffer.from(trimmed, 'base64'));
	}

	finish(): void {
		if (this.finished) return;
		this.finished = true;
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.close();
			return;
		}

		void this.transcribe().finally(() => {
			this.close();
		});
	}

	cancel(): void {
		this.close();
	}

	close(): void {
		this.markClosed();
	}

	private async transcribe(): Promise<void> {
		this.emit({
			type: 'committed',
			sessionId: this.id,
			itemId: this.id,
		});

		try {
			const formData = new FormData();
			const audio = Buffer.concat(this.audioChunks);
			const audioBytes = audio.buffer.slice(
				audio.byteOffset,
				audio.byteOffset + audio.byteLength
			) as ArrayBuffer;
			const language = normalizeXaiLanguageCode(this.config.request?.language);

			formData.append('audio_format', 'pcm');
			formData.append('sample_rate', String(REALTIME_TRANSCRIPTION_SAMPLE_RATE));
			if (language) {
				formData.append('language', language);
				formData.append('format', 'true');
			}
			formData.append(
				'file',
				new Blob([audioBytes], { type: 'application/octet-stream' }),
				'friday-dictation.pcm'
			);

			const response = await fetch(createXaiSpeechToTextUrl(this.config.provider.baseUrl), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.config.provider.apiKey.trim()}`,
				},
				body: formData,
			});
			const body = parseResponseBody(await response.text().catch(() => ''));
			if (!response.ok) {
				const message = extractResponseError(body) || response.statusText;
				throw new Error(`xAI speech-to-text failed (${response.status}): ${message}`);
			}

			this.emit({
				type: 'completed',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				transcript: extractTranscriptText(body),
			});
		} catch (error) {
			this.emitError(providerErrorMessage(error));
		}
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private emitError(message: string): void {
		this.emit({ type: 'error', sessionId: this.id, message });
	}

	private markClosed(): void {
		if (this.closed) return;
		this.closed = true;
		this.emit({ type: 'closed', sessionId: this.id });
		this.config.callbacks.closed(this.id);
	}
}

class XaiStreamingSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private socket: WebSocket | null = null;
	private closeTimer: NodeJS.Timeout | null = null;
	private audioByteLength = 0;
	private committedTranscript = '';
	private displayedTranscript = '';
	private emittedCommit = false;
	private closed = false;
	private finished = false;
	private closeAfterFinal = false;
	private readySettled = false;
	private readonly readyPromise: Promise<void>;
	private resolveReady: (() => void) | null = null;
	private rejectReady: ((error: Error) => void) | null = null;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
		this.readyPromise = new Promise((resolve, reject) => {
			this.resolveReady = resolve;
			this.rejectReady = reject;
		});
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		const url = createXaiRealtimeTranscriptionUrl(
			this.config.provider.baseUrl,
			this.config.request
		);
		this.socket = createXaiRealtimeTranscriptionSocket(
			url,
			this.config.provider.apiKey.trim()
		);
		this.bindSocket(this.socket);

		const timeout = setTimeout(() => {
			this.completeReady(new Error('Realtime transcription connection timed out.'));
		}, CONNECT_TIMEOUT_MS);
		try {
			await this.readyPromise;
		} catch (error) {
			this.close();
			throw new Error(providerErrorMessage(error));
		} finally {
			clearTimeout(timeout);
		}

		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const trimmed = audio.trim();
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(trimmed);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		this.sendAudio(Buffer.from(trimmed, 'base64'));
	}

	finish(): void {
		if (this.finished) return;
		this.finished = true;
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.close();
			return;
		}

		this.closeAfterFinal = true;
		this.emitCommitted();
		this.sendJson({ type: 'audio.done' });
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
			const message = providerErrorMessage(error);
			this.completeReady(new Error(message));
			this.emitError(message);
		});
		socket.on('close', () => {
			this.completeReady(
				new Error('Realtime transcription connection closed before it was ready.')
			);
			this.markClosed();
		});
	}

	private handleMessage(data: WebSocket.RawData): void {
		let event: XaiRealtimeEvent;
		try {
			event = JSON.parse(socketDataToString(data)) as XaiRealtimeEvent;
		} catch (error) {
			this.emitError(providerErrorMessage(error));
			return;
		}

		if (event.type === 'transcript.created') {
			this.completeReady();
			return;
		}

		if (event.type === 'transcript.partial') {
			this.handlePartialTranscript(event);
			return;
		}

		if (event.type === 'transcript.done') {
			this.completeTranscript(extractTranscriptText(event) || this.displayedTranscript);
			this.closeFinishedSession();
			return;
		}

		if (event.type === 'error') {
			this.completeReady(new Error(extractResponseError(event)));
			this.emitError(extractResponseError(event) || 'Realtime transcription failed.');
			this.closeFinishedSession();
		}
	}

	private handlePartialTranscript(event: XaiRealtimeEvent): void {
		const text = stringProperty(event, 'text');
		if (!text) return;

		const nextTranscript = appendTranscript(this.committedTranscript, text);
		this.updateDisplayedTranscript(nextTranscript);
		if (booleanProperty(event, 'speech_final')) {
			this.committedTranscript = nextTranscript;
			this.completeTranscript(nextTranscript);
		}
	}

	private updateDisplayedTranscript(transcript: string): void {
		if (!transcript || transcript === this.displayedTranscript) return;
		this.emitCommitted();
		if (transcript.startsWith(this.displayedTranscript)) {
			const delta = transcript.slice(this.displayedTranscript.length);
			this.displayedTranscript = transcript;
			this.emit({
				type: 'delta',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				delta,
			});
			return;
		}

		this.completeTranscript(transcript);
	}

	private completeTranscript(transcript: string): void {
		if (!transcript) return;
		this.displayedTranscript = transcript;
		this.emitCommitted();
		this.emit({
			type: 'completed',
			sessionId: this.id,
			itemId: this.id,
			contentIndex: 0,
			transcript,
		});
	}

	private completeReady(error?: Error): void {
		if (this.readySettled) return;
		this.readySettled = true;
		if (error) {
			this.rejectReady?.(error);
		} else {
			this.resolveReady?.();
		}
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private emitError(message: string): void {
		this.emit({ type: 'error', sessionId: this.id, message });
	}

	private emitCommitted(): void {
		if (this.emittedCommit) return;
		this.emittedCommit = true;
		this.emit({
			type: 'committed',
			sessionId: this.id,
			itemId: this.id,
		});
	}

	private sendAudio(audio: Buffer): void {
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		socket.send(audio, (error) => {
			if (error) this.emitError(providerErrorMessage(error));
		});
	}

	private sendJson(payload: XaiRealtimeEvent): void {
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		socket.send(JSON.stringify(payload), (error) => {
			if (error) this.emitError(providerErrorMessage(error));
		});
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

export class XaiSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		const normalizedModelId = modelId.trim();
		return (
			providerId.trim().toLowerCase() === XAI_PROVIDER_ID &&
			(normalizedModelId === XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID ||
				normalizedModelId === XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID)
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = config.model.id.trim();
		if (model === XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID) {
			const session = new XaiBatchSpeechToTextSession(config);
			await session.start();
			return session;
		}
		if (model !== XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID) {
			throw new Error(
				`xAI speech-to-text requires ${XAI_BATCH_SPEECH_TO_TEXT_MODEL_ID} or ${XAI_STREAMING_SPEECH_TO_TEXT_MODEL_ID}.`
			);
		}
		const session = new XaiStreamingSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createXaiSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new XaiSpeechToTextAdapter();
}
