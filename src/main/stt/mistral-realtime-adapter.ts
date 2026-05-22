import { Buffer } from 'node:buffer';
import type {
	RealtimeConnection,
	RealtimeEvent,
} from '@mistralai/mistralai/extra/realtime';
import type { RealtimeTranscriptionSession } from '../../shared/realtime-transcription';
import { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from '../../shared/service';
import { MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID } from '../../shared/provider-models';
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

export function createMistralRealtimeServerUrl(baseUrl: string | undefined): string {
	if (!baseUrl?.trim()) return DEFAULT_MISTRAL_REALTIME_SERVER_URL;

	try {
		const url = new URL(baseUrl);
		url.protocol = url.protocol === 'http:' || url.protocol === 'ws:' ? 'ws:' : 'wss:';
		url.pathname = '';
		url.search = '';
		url.hash = '';
		return url.toString().replace(/\/$/, '');
	} catch {
		return DEFAULT_MISTRAL_REALTIME_SERVER_URL;
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
			if (!event.text) return;
			this.transcript += event.text;
			this.emit({
				type: 'delta',
				sessionId: this.id,
				itemId: this.id,
				contentIndex: 0,
				delta: event.text,
			});
			return;
		}

		if (event.type === 'transcription.done') {
			const transcript = event.text || this.transcript;
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
			this.emitError(stringifyMessage(event.error.message));
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
		return (
			providerId.trim().toLowerCase() === MISTRAL_PROVIDER_ID &&
			modelId.trim() === MISTRAL_REALTIME_SPEECH_TO_TEXT_MODEL_ID
		);
	}

	async startSession(config: SpeechToTextRuntimeConfig): Promise<SpeechToTextRealtimeSession> {
		const model = config.model.id.trim();
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
