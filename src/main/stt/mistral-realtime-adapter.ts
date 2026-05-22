import { Buffer } from 'node:buffer';
import type {
	RealtimeConnection,
	RealtimeEvent,
} from '@mistralai/mistralai/extra/realtime';
import type { RealtimeTranscriptionSession } from '../../shared/realtime-transcription';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../shared/agents/service';
import {
	MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID,
	MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
} from '../../shared/providers';
import {
	decodedRealtimeTranscriptionAudioByteLength,
	hasMinimumRealtimeTranscriptionAudio,
} from './audio';
import type {
	SpeechToTextRealtimeAdapter,
	SpeechToTextRealtimeSession,
	SpeechToTextRuntimeConfig,
} from './types';

const MISTRAL_PROVIDER_ID = 'mistral';
const CONNECT_TIMEOUT_MS = 10_000;
const FINISH_CLOSE_DELAY_MS = 15_000;
const PCM_BYTES_PER_SAMPLE = 2;
const DEFAULT_MISTRAL_REALTIME_SERVER_URL = 'wss://api.mistral.ai';

function providerErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return 'Realtime transcription failed.';
}

function stringifyMessage(message: unknown): string {
	if (typeof message === 'string') return message;
	try {
		return JSON.stringify(message);
	} catch {
		return 'Realtime transcription failed.';
	}
}

function stringProperty(value: unknown, key: string): string {
	if (typeof value !== 'object' || value === null) return '';
	const text = (value as Record<string, unknown>)[key];
	return typeof text === 'string' ? text : '';
}

function normalizeLanguage(language: unknown): string | undefined {
	if (typeof language !== 'string') return undefined;
	const trimmed = language.trim();
	if (!trimmed) return undefined;
	if (!/^[a-z]{2}(?:-[A-Za-z0-9]{2,8})?$/.test(trimmed)) return undefined;
	return trimmed;
}

function realtimeEventErrorMessage(event: RealtimeEvent): string {
	if (!('error' in event) || !event.error) return 'Realtime transcription failed.';
	const error = event.error;
	if (error instanceof Error) return providerErrorMessage(error);
	if (typeof error !== 'object' || error === null) return stringifyMessage(error);
	return stringifyMessage((error as { message?: unknown }).message);
}

export function createMistralHttpServerUrl(baseUrl: string | undefined): string | undefined {
	const trimmed = baseUrl?.trim().replace(/\/+$/, '');
	if (!trimmed) return undefined;
	return trimmed.endsWith('/v1') ? trimmed.slice(0, -3) : trimmed;
}

export function createMistralRealtimeServerUrl(baseUrl: string | undefined): string {
	const serverUrl = createMistralHttpServerUrl(baseUrl);
	if (!serverUrl) return DEFAULT_MISTRAL_REALTIME_SERVER_URL;

	try {
		const url = new URL(serverUrl);
		url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return DEFAULT_MISTRAL_REALTIME_SERVER_URL;
	}
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

class MistralOfflineSpeechToTextSession implements SpeechToTextRealtimeSession {
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
			const { Mistral } = await import('@mistralai/mistralai');
			const client = new Mistral({
				apiKey: this.config.provider.apiKey.trim(),
				serverURL: createMistralHttpServerUrl(this.config.provider.baseUrl),
			});
			const language = normalizeLanguage(this.config.request?.language);
			const audio = createPcm16MonoWavBuffer(
				Buffer.concat(this.audioChunks),
				REALTIME_TRANSCRIPTION_SAMPLE_RATE
			);
			const transcript = await client.audio.transcriptions.complete({
				model: this.model,
				file: {
					fileName: 'friday-dictation.wav',
					content: audio,
				},
				...(language ? { language } : {}),
			});

			this.emit({
				type: 'completed',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				transcript: transcript.text,
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

class MistralRealtimeSpeechToTextSession implements SpeechToTextRealtimeSession {
	readonly model: string;
	readonly sampleRate = REALTIME_TRANSCRIPTION_SAMPLE_RATE;
	private connection: RealtimeConnection | null = null;
	private closeTimer: NodeJS.Timeout | null = null;
	private audioByteLength = 0;
	private transcript = '';
	private closed = false;
	private closeAfterFinal = false;

	constructor(private readonly config: SpeechToTextRuntimeConfig) {
		this.model = config.model.id;
	}

	get id(): string {
		return this.config.sessionId;
	}

	async start(): Promise<RealtimeTranscriptionSession> {
		const { AudioEncoding, RealtimeTranscription } = await import(
			'@mistralai/mistralai/extra/realtime'
		);
		const client = new RealtimeTranscription({
			apiKey: this.config.provider.apiKey.trim(),
			serverURL: createMistralRealtimeServerUrl(this.config.provider.baseUrl),
			timeoutMs: CONNECT_TIMEOUT_MS,
		});

		try {
			this.connection = await client.connect(this.model, {
				audioFormat: {
					encoding: AudioEncoding.PcmS16le,
					sampleRate: REALTIME_TRANSCRIPTION_SAMPLE_RATE,
				},
				timeoutMs: CONNECT_TIMEOUT_MS,
			});
		} catch (error) {
			throw new Error(providerErrorMessage(error));
		}

		void this.readEvents(this.connection);
		this.emit({ type: 'started', sessionId: this.id, model: this.model });
		return { id: this.id, model: this.model, sampleRate: this.sampleRate };
	}

	appendAudio(audio: string): void {
		const trimmed = audio.trim();
		const audioByteLength = decodedRealtimeTranscriptionAudioByteLength(trimmed);
		if (audioByteLength === 0) return;

		this.audioByteLength += audioByteLength;
		const audioBytes = Buffer.from(trimmed, 'base64');
		void this.connection?.sendAudio(audioBytes).catch((error) => {
			this.emitError(providerErrorMessage(error));
		});
	}

	finish(): void {
		if (!hasMinimumRealtimeTranscriptionAudio(this.audioByteLength)) {
			this.close();
			return;
		}

		this.closeAfterFinal = true;
		const connection = this.connection;
		if (!connection || connection.isClosed) {
			this.close();
			return;
		}

		void (async (): Promise<void> => {
			await connection.flushAudio();
			await connection.endAudio();
			this.scheduleClose();
		})().catch((error) => {
			this.emitError(providerErrorMessage(error));
			this.close();
		});
	}

	cancel(): void {
		this.close();
	}

	close(): void {
		this.clearCloseTimer();
		const connection = this.connection;
		if (!connection || connection.isClosed) {
			this.markClosed();
			return;
		}

		void connection.close(1000, 'dictation stopped').finally(() => {
			this.markClosed();
		});
	}

	private async readEvents(connection: RealtimeConnection): Promise<void> {
		try {
			for await (const event of connection) {
				this.handleEvent(event);
			}
		} catch (error) {
			this.emitError(providerErrorMessage(error));
		} finally {
			this.markClosed();
		}
	}

	private handleEvent(event: RealtimeEvent): void {
		if (event.type === 'transcription.text.delta') {
			const delta = stringProperty(event, 'text');
			if (!delta) return;
			this.transcript += delta;
			this.emit({
				type: 'delta',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				delta,
			});
			return;
		}

		if (event.type === 'transcription.done') {
			const transcript = stringProperty(event, 'text') || this.transcript;
			this.emit({
				type: 'completed',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				transcript,
			});
			this.closeFinishedSession();
			return;
		}

		if (event.type === 'error') {
			this.emitError(realtimeEventErrorMessage(event));
			this.closeFinishedSession();
			return;
		}

		if ('raw' in event && event.error) {
			this.emitError(providerErrorMessage(event.error));
			this.closeFinishedSession();
		}
	}

	private emit(event: Parameters<SpeechToTextRuntimeConfig['callbacks']['emit']>[0]): void {
		this.config.callbacks.emit(event);
	}

	private emitError(message: string): void {
		this.emit({ type: 'error', sessionId: this.id, message });
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

export class MistralRealtimeSpeechToTextAdapter implements SpeechToTextRealtimeAdapter {
	supports(providerId: string, modelId: string): boolean {
		const normalizedModelId = modelId.trim();
		return (
			providerId.trim().toLowerCase() === MISTRAL_PROVIDER_ID &&
			(normalizedModelId === MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID ||
				normalizedModelId === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID)
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = config.model.id.trim();
		if (model === MISTRAL_OFFLINE_SPEECH_TO_TEXT_MODEL_ID) {
			const session = new MistralOfflineSpeechToTextSession(config);
			await session.start();
			return session;
		}
		if (model !== MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID) {
			throw new Error(
				`Mistral realtime speech-to-text requires ${MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID}.`
			);
		}
		const session = new MistralRealtimeSpeechToTextSession(config);
		await session.start();
		return session;
	}
}

export function createMistralRealtimeSpeechToTextAdapter(): SpeechToTextRealtimeAdapter {
	return new MistralRealtimeSpeechToTextAdapter();
}
