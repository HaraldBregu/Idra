import { Buffer } from 'node:buffer';
import WebSocket from 'ws';
import {
	ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID,
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

type ElevenLabsRealtimeEvent = Record<string, unknown> & {
	message_type?: string;
	type?: string;
};

const ELEVENLABS_PROVIDER_ID = 'elevenlabs';
const DEFAULT_ELEVENLABS_HTTP_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_ELEVENLABS_REALTIME_BASE_URL = 'wss://api.elevenlabs.io/v1';
const ELEVENLABS_AUDIO_FORMAT = 'pcm_24000';
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;
const PCM_BYTES_PER_SAMPLE = 2;
const FINISH_SILENCE_MS = 100;

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

function normalizeLanguageCode(language: unknown): string | undefined {
	if (typeof language !== 'string') return undefined;
	const trimmed = language.trim().toLowerCase();
	if (!trimmed) return undefined;
	const primary = trimmed.split(/[-_]/)[0];
	if (/^[a-z]{2,3}$/.test(primary)) return primary;
	return undefined;
}

function createPcm16MonoWavBuffer(audio: Buffer, sampleRate: number): Buffer {
	const header = Buffer.alloc(44);
	const byteRate = sampleRate * PCM_BYTES_PER_SAMPLE;
	header.write('RIFF', 0);
	header.writeUInt32LE(36 + audio.byteLength, 4);
	header.write('WAVE', 8);
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(sampleRate, 24);
	header.writeUInt32LE(byteRate, 28);
	header.writeUInt16LE(PCM_BYTES_PER_SAMPLE, 32);
	header.writeUInt16LE(16, 34);
	header.write('data', 36);
	header.writeUInt32LE(audio.byteLength, 40);
	return Buffer.concat([header, audio]);
}

function appendElevenLabsEndpoint(baseUrl: string | undefined, endpoint: string): URL {
	const url = new URL(baseUrl?.trim() || DEFAULT_ELEVENLABS_HTTP_BASE_URL);
	const path = url.pathname.replace(/\/+$/, '');
	if (path.endsWith(endpoint)) {
		url.pathname = path;
		return url;
	}
	if (!path || path === '/') {
		url.pathname = `/v1${endpoint}`;
		return url;
	}
	if (path.endsWith('/v1')) {
		url.pathname = `${path}${endpoint}`;
		return url;
	}
	url.pathname = `${path}${endpoint}`;
	return url;
}

function extractTranscriptText(value: unknown): string {
	if (typeof value !== 'object' || value === null) return '';
	const record = value as Record<string, unknown>;
	const text = record.text;
	if (typeof text === 'string') return text;

	const transcripts = record.transcripts;
	if (Array.isArray(transcripts)) {
		return transcripts.map(extractTranscriptText).filter(Boolean).join('\n');
	}
	if (typeof transcripts === 'object' && transcripts !== null) {
		return Object.values(transcripts).map(extractTranscriptText).filter(Boolean).join('\n');
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

function socketDataToString(data: WebSocket.RawData): string {
	if (typeof data === 'string') return data;
	if (Buffer.isBuffer(data)) return data.toString('utf8');
	if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
	if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
	return Buffer.from(data as ArrayBuffer).toString('utf8');
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

export function createElevenLabsSpeechToTextUrl(baseUrl: string | undefined): string {
	const url = appendElevenLabsEndpoint(baseUrl, '/speech-to-text');
	url.search = '';
	url.hash = '';
	return url.toString();
}

export function createElevenLabsRealtimeTranscriptionUrl(
	baseUrl: string | undefined,
	modelId: string,
	request?: RealtimeTranscriptionStartRequest
): string {
	if (modelId.trim() !== ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID) {
		throw new Error(`ElevenLabs realtime speech-to-text is not available for model "${modelId}".`);
	}

	const url = appendElevenLabsEndpoint(
		baseUrl || DEFAULT_ELEVENLABS_REALTIME_BASE_URL,
		'/speech-to-text/realtime'
	);
	url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
	url.search = '';
	url.hash = '';
	url.searchParams.set('model_id', ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID);
	url.searchParams.set('audio_format', ELEVENLABS_AUDIO_FORMAT);
	url.searchParams.set('commit_strategy', 'manual');

	const language = normalizeLanguageCode(request?.language);
	if (language) url.searchParams.set('language_code', language);
	return url.toString();
}

export function createElevenLabsRealtimeTranscriptionSocket(
	url: string,
	apiKey: string
): WebSocket {
	return new WebSocket(url, {
		headers: {
			'xi-api-key': apiKey,
		},
	});
}

class ElevenLabsOfflineSpeechToTextSession implements SpeechToTextRealtimeSession {
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
			const audio = createPcm16MonoWavBuffer(
				Buffer.concat(this.audioChunks),
				REALTIME_TRANSCRIPTION_SAMPLE_RATE
			);
			const audioBytes = audio.buffer.slice(
				audio.byteOffset,
				audio.byteOffset + audio.byteLength
			) as ArrayBuffer;
			formData.append('model_id', ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID);
			formData.append('file', new Blob([audioBytes], { type: 'audio/wav' }), 'friday-dictation.wav');

			const language = normalizeLanguageCode(this.config.request?.language);
			if (language) formData.append('language_code', language);

			const response = await fetch(createElevenLabsSpeechToTextUrl(this.config.provider.baseUrl), {
				method: 'POST',
				headers: {
					'xi-api-key': this.config.provider.apiKey.trim(),
				},
				body: formData,
			});
			const body = (await response.json().catch(() => null)) as unknown;
			if (!response.ok) {
				const message = extractResponseError(body) || response.statusText;
				throw new Error(
					`ElevenLabs speech-to-text failed (${response.status}): ${message}`
				);
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

class ElevenLabsRealtimeSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private socket: WebSocket | null = null;
	private closeTimer: NodeJS.Timeout | null = null;
	private audioByteLength = 0;
	private partialTranscript = '';
	private committedTranscript = '';
	private lastCommittedEventText = '';
	private closed = false;
	private closeAfterFinal = false;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		const url = createElevenLabsRealtimeTranscriptionUrl(
			this.config.provider.baseUrl,
			this.config.model.id,
			this.config.request
		);
		this.socket = createElevenLabsRealtimeTranscriptionSocket(
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
		this.sendAudioChunk(trimmed);
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
		let event: ElevenLabsRealtimeEvent;
		try {
			event = JSON.parse(socketDataToString(data)) as ElevenLabsRealtimeEvent;
		} catch (error) {
			this.emitError(providerErrorMessage(error));
			return;
		}

		const eventType = event.message_type || event.type;
		if (eventType === 'partial_transcript') {
			this.emitPartialTranscript(stringProperty(event, 'text'));
			return;
		}

		if (
			eventType === 'committed_transcript' ||
			eventType === 'committed_transcript_with_timestamps'
		) {
			this.completeCommittedTranscript(stringProperty(event, 'text'));
			return;
		}

		if (eventType === 'error') {
			this.emitError(extractResponseError(event) || 'Realtime transcription failed.');
			this.closeFinishedSession();
		}
	}

	private emitPartialTranscript(text: string): void {
		if (!text) return;
		const delta = text.startsWith(this.partialTranscript)
			? text.slice(this.partialTranscript.length)
			: '';
		this.partialTranscript = text;
		if (!delta) return;

		this.emit({
			type: 'delta',
			sessionId: this.id,
			itemId: this.id,
			contentIndex: 0,
			delta,
		});
	}

	private completeCommittedTranscript(text: string): void {
		if (!text || text === this.lastCommittedEventText) {
			this.closeFinishedSession();
			return;
		}

		this.lastCommittedEventText = text;
		this.partialTranscript = '';
		this.committedTranscript = this.committedTranscript
			? `${this.committedTranscript} ${text}`.trim()
			: text;
		this.emit({
			type: 'completed',
			sessionId: this.id,
			itemId: this.id,
			contentIndex: 0,
			transcript: this.committedTranscript,
		});
		this.closeFinishedSession();
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private emitError(message: string): void {
		this.emit({ type: 'error', sessionId: this.id, message });
	}

	private send(payload: ElevenLabsRealtimeEvent): void {
		const socket = this.socket;
		if (!socket || socket.readyState !== WebSocket.OPEN) return;

		socket.send(JSON.stringify(payload), (error) => {
			if (error) this.emitError(providerErrorMessage(error));
		});
	}

	private sendAudioChunk(audioBase64: string, commit = false): void {
		this.send({
			message_type: 'input_audio_chunk',
			audio_base_64: audioBase64,
			sample_rate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
			...(commit ? { commit: true } : {}),
		});
	}

	private commitAudioBuffer(): void {
		this.emit({
			type: 'committed',
			sessionId: this.id,
			itemId: this.id,
		});
		const silenceBytes = Math.floor(
			(REALTIME_TRANSCRIPTION_SAMPLE_RATE * PCM_BYTES_PER_SAMPLE * FINISH_SILENCE_MS) / 1000
		);
		this.sendAudioChunk(Buffer.alloc(silenceBytes).toString('base64'), true);
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

export class ElevenLabsSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		const normalizedModelId = modelId.trim();
		return (
			providerId.trim().toLowerCase() === ELEVENLABS_PROVIDER_ID &&
			(normalizedModelId === ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID ||
				normalizedModelId === ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID)
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = config.model.id.trim();
		if (model === ELEVENLABS_SCRIBE_SPEECH_TO_TEXT_MODEL_ID) {
			const session = new ElevenLabsOfflineSpeechToTextSession(config);
			await session.start();
			return session;
		}
		if (model !== ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID) {
			throw new Error(
				`ElevenLabs realtime speech-to-text requires ${ELEVENLABS_SCRIBE_REALTIME_SPEECH_TO_TEXT_MODEL_ID}.`
			);
		}
		const session = new ElevenLabsRealtimeSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createElevenLabsSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new ElevenLabsSpeechToTextAdapter();
}
