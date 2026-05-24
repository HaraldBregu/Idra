import { Buffer } from 'node:buffer';
import WebSocket from 'ws';
import {
	DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID,
	DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID,
	DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID,
} from '../../shared/providers';
import type {
	RealtimeTranscriptionSession,
	RealtimeTranscriptionStartRequest,
} from '../../shared/realtime-transcription';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../shared/agents/service';
import {
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
} from './audio';
import type {
	SpeechToTextRealtimeAdapter,
	SpeechToTextRealtimeSession,
	SpeechToTextRuntimeConfig,
} from './types';

type DeepgramEvent = Record<string, unknown> & { type?: string };

const DEFAULT_DEEPGRAM_BASE_URL = 'https://api.deepgram.com/v1';
const DEEPGRAM_FLUX_EN_MODEL = 'flux-general-en';
const DEEPGRAM_FLUX_MULTI_MODEL = 'flux-general-multi';
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;

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

function appendTranscript(prefix: string, text: string): string {
	const normalizedPrefix = prefix.trim();
	const normalizedText = text.trim();
	if (!normalizedText) return normalizedPrefix;
	if (!normalizedPrefix) return normalizedText;
	if (normalizedText.startsWith(normalizedPrefix)) return normalizedText;
	return `${normalizedPrefix} ${normalizedText}`.trim();
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

function createDeepgramListenUrl(baseUrl: string | undefined, version: 'v1' | 'v2'): URL {
	const url = new URL(baseUrl?.trim() || DEFAULT_DEEPGRAM_BASE_URL);
	let path = url.pathname.replace(/\/+$/, '');
	path = path.replace(/\/v[12](?:\/listen)?$/, '');
	url.pathname = !path || path === '/' ? `/${version}/listen` : `${path}/${version}/listen`;
	url.search = '';
	url.hash = '';
	return url;
}

function socketDataToString(data: WebSocket.RawData): string {
	if (typeof data === 'string') return data;
	if (Buffer.isBuffer(data)) return data.toString('utf8');
	if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
	return Buffer.from(data as ArrayBuffer).toString('utf8');
}

function extractResponseError(value: unknown): string {
	if (typeof value === 'string' && value.trim()) return value;
	if (typeof value !== 'object' || value === null) return '';
	const record = value as Record<string, unknown>;
	for (const key of ['message', 'description', 'detail', 'error']) {
		const nested = record[key];
		if (typeof nested === 'string' && nested.trim()) return nested;
		if (typeof nested === 'object' && nested !== null) {
			const message = extractResponseError(nested);
			if (message) return message;
		}
	}
	return '';
}

function extractDeepgramTranscript(value: unknown): string {
	if (typeof value !== 'object' || value === null) return '';
	const record = value as Record<string, unknown>;

	const transcript = record.transcript;
	if (typeof transcript === 'string') return transcript;

	const channel = record.channel;
	if (typeof channel === 'object' && channel !== null) {
		const alternatives = (channel as { alternatives?: unknown }).alternatives;
		if (Array.isArray(alternatives)) {
			return alternatives.map(extractDeepgramTranscript).filter(Boolean).join(' ');
		}
	}

	const results = record.results;
	if (typeof results === 'object' && results !== null) {
		const channels = (results as { channels?: unknown }).channels;
		if (Array.isArray(channels)) {
			return channels.map(extractDeepgramTranscript).filter(Boolean).join('\n');
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

export function resolveDeepgramRealtimeSpeechToTextModel(
	modelId: string,
	request?: RealtimeTranscriptionStartRequest
): string | null {
	const model = modelId.trim();
	if (model !== DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID) return null;
	const language = normalizeLanguage(request?.language)?.toLowerCase().split('-')[0];
	return language && language !== 'en' ? DEEPGRAM_FLUX_MULTI_MODEL : DEEPGRAM_FLUX_EN_MODEL;
}

export function createDeepgramSpeechToTextUrl(
	baseUrl: string | undefined,
	modelId: string,
	request?: RealtimeTranscriptionStartRequest
): string {
	if (modelId.trim() !== DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID) {
		throw new Error(`Deepgram batch speech-to-text is not available for model "${modelId}".`);
	}

	const url = createDeepgramListenUrl(baseUrl, 'v1');
	url.protocol = url.protocol === 'ws:' ? 'http:' : url.protocol === 'wss:' ? 'https:' : url.protocol;
	url.searchParams.set('model', DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID);
	url.searchParams.set('encoding', 'linear16');
	url.searchParams.set('sample_rate', String(REALTIME_TRANSCRIPTION_SAMPLE_RATE));
	url.searchParams.set('channels', '1');
	url.searchParams.set('smart_format', 'true');
	url.searchParams.set('punctuate', 'true');

	const language = normalizeLanguage(request?.language);
	if (language) url.searchParams.set('language', language);
	return url.toString();
}

export function createDeepgramRealtimeTranscriptionUrl(
	baseUrl: string | undefined,
	modelId: string,
	request?: RealtimeTranscriptionStartRequest
): string {
	const upstreamModel = resolveDeepgramRealtimeSpeechToTextModel(modelId, request);
	if (!upstreamModel) {
		throw new Error(`Deepgram realtime speech-to-text is not available for model "${modelId}".`);
	}

	const url = createDeepgramListenUrl(baseUrl, 'v2');
	url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
	url.searchParams.set('model', upstreamModel);
	url.searchParams.set('encoding', 'linear16');
	url.searchParams.set('sample_rate', String(REALTIME_TRANSCRIPTION_SAMPLE_RATE));
	url.searchParams.set('mip_opt_out', 'true');

	const language = normalizeLanguage(request?.language)?.toLowerCase().split('-')[0];
	if (upstreamModel === DEEPGRAM_FLUX_MULTI_MODEL && language) {
		url.searchParams.set('language_hint', language);
	}
	return url.toString();
}

export function createDeepgramRealtimeTranscriptionSocket(
	url: string,
	apiKey: string
): WebSocket {
	return new WebSocket(url, {
		headers: {
			Authorization: `Token ${apiKey}`,
		},
	});
}

class DeepgramBatchSpeechToTextSession implements SpeechToTextRealtimeSession {
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
			const response = await fetch(
				createDeepgramSpeechToTextUrl(
					this.config.provider.baseUrl,
					this.model,
					this.config.request
				),
				{
					method: 'POST',
					headers: {
						Authorization: `Token ${this.config.provider.apiKey.trim()}`,
						'Content-Type': 'application/octet-stream',
					},
					body: Buffer.concat(this.audioChunks),
				}
			);
			const body = parseResponseBody(await response.text().catch(() => ''));
			if (!response.ok) {
				const message = extractResponseError(body) || response.statusText;
				throw new Error(`Deepgram speech-to-text failed (${response.status}): ${message}`);
			}

			this.emit({
				type: 'completed',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				transcript: extractDeepgramTranscript(body),
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

class DeepgramFluxSpeechToTextSession implements SpeechToTextRealtimeSession {
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

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		const url = createDeepgramRealtimeTranscriptionUrl(
			this.config.provider.baseUrl,
			this.config.model.id,
			this.config.request
		);
		this.socket = createDeepgramRealtimeTranscriptionSocket(
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

		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const trimmed = audio.trim();
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(trimmed);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		this.send(Buffer.from(trimmed, 'base64'));
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
		this.sendJson({ type: 'CloseStream' });
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
		let event: DeepgramEvent;
		try {
			event = JSON.parse(socketDataToString(data)) as DeepgramEvent;
		} catch (error) {
			this.emitError(providerErrorMessage(error));
			return;
		}

		if (event.type === 'TurnInfo') {
			this.completeTranscript(extractDeepgramTranscript(event));
			this.closeFinishedSession();
			return;
		}

		if (event.type === 'Error') {
			this.emitError(extractResponseError(event) || 'Realtime transcription failed.');
			this.closeFinishedSession();
		}
	}

	private completeTranscript(transcript: string): void {
		if (!transcript) return;
		this.committedTranscript = appendTranscript(this.committedTranscript, transcript);
		this.displayedTranscript = this.committedTranscript;
		this.emitCommitted();
		this.emit({
			type: 'completed',
			sessionId: this.id,
			itemId: this.id,
			contentIndex: 0,
			transcript: this.displayedTranscript,
		});
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

	private send(payload: Buffer): void {
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		socket.send(payload, (error) => {
			if (error) this.emitError(providerErrorMessage(error));
		});
	}

	private sendJson(payload: DeepgramEvent): void {
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

export class DeepgramSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		const normalizedModelId = modelId.trim();
		return (
			providerId.trim().toLowerCase() === DEEPGRAM_SPEECH_TO_TEXT_PROVIDER_ID &&
			(normalizedModelId === DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID ||
				normalizedModelId === DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID)
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = config.model.id.trim();
		if (model === DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID) {
			const session = new DeepgramBatchSpeechToTextSession(config);
			await session.start();
			return session;
		}
		if (model !== DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID) {
			throw new Error(
				`Deepgram speech-to-text requires ${DEEPGRAM_NOVA_3_SPEECH_TO_TEXT_MODEL_ID} or ${DEEPGRAM_FLUX_SPEECH_TO_TEXT_MODEL_ID}.`
			);
		}
		const session = new DeepgramFluxSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createDeepgramSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new DeepgramSpeechToTextAdapter();
}
