import WebSocket from 'ws';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../errors';
import type {
	SttAdapter,
	SttAdapterRealtimeStartRequest,
	SttAdapterTranscriptionRequest,
	SttProviderSpec,
	SttRealtimeConnection,
	SttRealtimeEventHandler,
} from '../types';
import type { SttTranscriptionResult } from '../../../shared/stt/transcription';
import {
	QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	QWEN_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
} from '../../../shared/providers/models/stt';

const QWEN_AUTH_SCHEME = 'Bearer';
const QWEN_REALTIME_BETA_HEADER = 'OpenAI-Beta';
const QWEN_REALTIME_BETA_VALUE = 'realtime=v1';
const QWEN_REALTIME_SESSION_UPDATE_EVENT = 'transcription_session.update';
const QWEN_REALTIME_AUDIO_FORMAT = 'pcm16';

type QwenRealtimeServerEvent = {
	type?: string;
	item_id?: string;
	content_index?: number;
	delta?: string;
	transcript?: string;
	error?: { message?: string };
};

export class QwenSttAdapter implements SttAdapter {
	private readonly provider: SttProviderSpec;

	constructor(provider: SttProviderSpec) {
		if (!provider.apiKey)
			throw new SttProviderAuthError(`${provider.name} API key not configured.`);
		this.provider = provider;
	}

	async transcribe(_request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		throw new SttProviderUnsupportedError(
			`${this.provider.name} does not expose a batch speech-to-text adapter in this runtime.`
		);
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		const socket = new WebSocket(qwenRealtimeUrl(this.provider.baseURL, request), {
			headers: {
				Authorization: `${QWEN_AUTH_SCHEME} ${this.provider.apiKey}`,
				[QWEN_REALTIME_BETA_HEADER]: QWEN_REALTIME_BETA_VALUE,
			},
		});
		await waitForOpen(socket);
		const connection = new QwenRealtimeSttConnection(socket, request, emit);
		connection.configure();
		return connection;
	}
}

class QwenRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;

	constructor(
		private readonly socket: WebSocket,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {
		this.socket.on('message', (data) => this.handleMessage(data.toString()));
		this.socket.once('close', () => this.emitClosed());
		this.socket.once('error', (error) => this.emitError(error.message));
	}

	configure(): void {
		this.socket.send(
			JSON.stringify({
				type: QWEN_REALTIME_SESSION_UPDATE_EVENT,
				session: {
					input_audio_format: QWEN_REALTIME_AUDIO_FORMAT,
					input_audio_transcription: {
						model: this.request.modelId,
						...(this.request.language ? { language: this.request.language } : {}),
						...(this.request.prompt ? { prompt: this.request.prompt } : {}),
					},
					turn_detection: null,
				},
			})
		);
	}

	async appendAudio(audio: string): Promise<void> {
		this.socket.send(JSON.stringify({ type: 'input_audio_buffer.append', audio }));
	}

	async finish(): Promise<void> {
		this.socket.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
	}

	async cancel(): Promise<void> {
		this.socket.close(1000, 'cancelled');
		this.emitClosed();
	}

	private handleMessage(message: string): void {
		let event: QwenRealtimeServerEvent;
		try {
			event = JSON.parse(message) as QwenRealtimeServerEvent;
		} catch {
			return;
		}

		if (event.type === 'input_audio_buffer.committed') {
			this.emit({
				type: 'committed',
				sessionId: this.request.sessionId,
				itemId: event.item_id ?? this.request.sessionId,
			});
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.delta') {
			this.emit({
				type: 'delta',
				sessionId: this.request.sessionId,
				itemId: event.item_id ?? this.request.sessionId,
				contentIndex: event.content_index ?? 0,
				delta: event.delta ?? '',
			});
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.completed') {
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: event.item_id ?? this.request.sessionId,
				contentIndex: event.content_index ?? 0,
				transcript: event.transcript ?? '',
			});
			this.socket.close(1000, 'completed');
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.failed') {
			this.emitError(event.error?.message ?? 'Qwen realtime transcription failed.');
			this.socket.close(1011, 'transcription failed');
			return;
		}
		if (event.type === 'error') {
			this.emitError(event.error?.message ?? 'Qwen realtime transcription error.');
		}
	}

	private emitError(message: string): void {
		if (!this.closed) this.emit({ type: 'error', sessionId: this.request.sessionId, message });
	}

	private emitClosed(): void {
		if (this.closed) return;
		this.closed = true;
		this.emit({ type: 'closed', sessionId: this.request.sessionId });
	}
}

function qwenRealtimeUrl(
	baseURL: string | undefined,
	request: SttAdapterRealtimeStartRequest
): string {
	const url = new URL(
		baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[QWEN_SPEECH_TO_TEXT_PROVIDER_ID]
	);
	url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
	url.searchParams.set('model', request.modelId || QWEN_ASR_FLASH_REALTIME_SPEECH_TO_TEXT_MODEL_ID);
	return url.toString();
}

async function waitForOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		socket.once('open', resolve);
		socket.once('error', reject);
	});
}
