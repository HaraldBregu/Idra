import OpenAI from 'openai';
import WebSocket from 'ws';
import { createAudioFile } from '../audio';
import { SttProviderAuthError, SttProviderUnsupportedError } from '../errors';
import type {
	SttAdapter,
	SttAdapterRealtimeStartRequest,
	SttAdapterTranscriptionRequest,
	SttProviderSpec,
	SttRealtimeConnection,
	SttRealtimeEventHandler,
} from '../types';
import type { SttTranscriptionResult, SttUsage } from '../../../shared/stt/transcription';
import {
	OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID,
	OPENAI_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
} from '../../../shared/providers/models/stt';

const OPENAI_REALTIME_PATH = 'realtime';
const OPENAI_REALTIME_AUTH_SCHEME = 'Bearer';
const OPENAI_REALTIME_SESSION_UPDATE_EVENT = 'transcription_session.update';
const OPENAI_REALTIME_AUDIO_FORMAT = 'pcm16';

export interface OpenAISttAdapterOptions extends SttProviderSpec {
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => OpenAI;
}

type OpenAIRealtimeServerEvent = {
	type?: string;
	item_id?: string;
	content_index?: number;
	delta?: string;
	transcript?: string;
	error?: { message?: string };
};

export class OpenAISttAdapter implements SttAdapter {
	private readonly client: OpenAI;
	private readonly provider: SttProviderSpec;

	constructor(opts: OpenAISttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		const factory =
			opts.clientFactory ?? ((c) => new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL }));
		this.client = factory({ apiKey: opts.apiKey, baseURL: opts.baseURL });
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		try {
			const file = await createAudioFile(request.audio);
			const response = await this.client.audio.transcriptions.create(
				{
					file,
					model: request.modelId,
					language: request.language,
					prompt: request.prompt,
					temperature: request.temperature,
				},
				{ signal: request.signal }
			);
			const text = typeof response === 'string' ? response : response.text;
			const usage = typeof response === 'string' ? undefined : toUsage(response.usage);

			return {
				text,
				metadata: {
					providerId: this.provider.id,
					providerName: this.provider.name,
					modelId: request.modelId,
					...(request.language ? { language: request.language } : {}),
					createdAt: new Date().toISOString(),
					...(usage ? { usage } : {}),
				},
			};
		} catch (error) {
			const status = (error as { status?: number }).status ?? 0;
			const message = (error as Error).message ?? String(error);
			if (status === 401 || status === 403) throw new SttProviderAuthError(message);
			throw error;
		}
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		if (this.provider.id !== OPENAI_SPEECH_TO_TEXT_PROVIDER_ID) {
			throw new SttProviderUnsupportedError(
				`${this.provider.name} realtime speech-to-text is not implemented.`
			);
		}

		const socket = new WebSocket(openAIRealtimeUrl(this.provider.baseURL), {
			headers: {
				Authorization: `${OPENAI_REALTIME_AUTH_SCHEME} ${this.provider.apiKey}`,
			},
		});
		await waitForOpen(socket);
		const session = new OpenAIRealtimeSttConnection(socket, request, emit);
		session.configure();
		return session;
	}
}

class OpenAIRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;

	constructor(
		private readonly socket: WebSocket,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {
		this.socket.on('message', (data) => this.handleEvent(data.toString()));
		this.socket.once('error', (error) => this.emitError(error.message));
		this.socket.once('close', () => this.emitClosed());
	}

	configure(): void {
		this.socket.send(
			JSON.stringify({
				type: OPENAI_REALTIME_SESSION_UPDATE_EVENT,
				session: {
					input_audio_format: OPENAI_REALTIME_AUDIO_FORMAT,
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

	private handleEvent(message: string): void {
		let event: OpenAIRealtimeServerEvent;
		try {
			event = JSON.parse(message) as OpenAIRealtimeServerEvent;
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
			this.emitError(event.error?.message ?? 'OpenAI realtime transcription failed.');
			this.socket.close(1011, 'transcription failed');
			return;
		}
		if (event.type === 'error') {
			this.emitError(event.error?.message ?? 'OpenAI realtime transcription error.');
		}
	}

	private emitEvent(event: Parameters<SttRealtimeEventHandler>[0]): void {
		if (!this.closed) this.emit(event);
	}

	private emitError(message: string): void {
		this.emitEvent({ type: 'error', sessionId: this.request.sessionId, message });
	}

	private emitClosed(): void {
		if (this.closed) return;
		this.closed = true;
		this.emit({ type: 'closed', sessionId: this.request.sessionId });
	}
}

function openAIRealtimeUrl(baseURL: string | undefined): string {
	const url = new URL(
		OPENAI_REALTIME_PATH,
		`${baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[OPENAI_SPEECH_TO_TEXT_PROVIDER_ID]}/`
	);
	url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:';
	url.searchParams.set('model', OPENAI_REALTIME_SPEECH_TO_TEXT_MODEL_ID);
	return url.toString();
}

async function waitForOpen(socket: WebSocket): Promise<void> {
	if (socket.readyState === WebSocket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		socket.once('open', resolve);
		socket.once('error', reject);
	});
}

function toUsage(usage: unknown): SttUsage | undefined {
	if (!usage || typeof usage !== 'object') return undefined;
	const value = usage as {
		input_tokens?: number;
		output_tokens?: number;
		total_tokens?: number;
		seconds?: number;
	};
	const next: SttUsage = {
		...(typeof value.input_tokens === 'number' ? { inputTokens: value.input_tokens } : {}),
		...(typeof value.output_tokens === 'number' ? { outputTokens: value.output_tokens } : {}),
		...(typeof value.total_tokens === 'number' ? { totalTokens: value.total_tokens } : {}),
		...(typeof value.seconds === 'number' ? { durationSeconds: value.seconds } : {}),
	};
	return Object.keys(next).length > 0 ? next : undefined;
}
