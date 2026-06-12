import OpenAI from 'openai';
import { OpenAIRealtimeWS } from 'openai/realtime/ws';
import type { RealtimeServerEvent } from 'openai/resources/realtime/realtime';
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

export interface OpenAISttAdapterOptions extends SttProviderSpec {
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => OpenAI;
}

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
		if (this.provider.id !== 'openai') {
			throw new SttProviderUnsupportedError(
				`${this.provider.name} realtime speech-to-text is not implemented.`
			);
		}

		const connection = await OpenAIRealtimeWS.create(this.client, {
			model: realtimeModelFor(request.modelId),
		});
		await waitForOpen(connection);
		const session = new OpenAIRealtimeSttConnection(connection, request, emit);
		session.configure();
		return session;
	}
}

class OpenAIRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;

	constructor(
		private readonly connection: OpenAIRealtimeWS,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {
		this.connection.on('event', (event) => this.handleEvent(event));
		this.connection.on('error', (error) => this.emitError(error.message));
		this.connection.socket.once('close', () => this.emitClosed());
	}

	configure(): void {
		this.connection.send({
			type: 'transcription_session.update',
			session: {
				input_audio_format: 'pcm16',
				input_audio_transcription: {
					model: this.request.modelId as 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe',
					...(this.request.language ? { language: this.request.language } : {}),
					...(this.request.prompt ? { prompt: this.request.prompt } : {}),
				},
				turn_detection: null,
			},
		});
	}

	async appendAudio(audio: string): Promise<void> {
		this.connection.send({ type: 'input_audio_buffer.append', audio });
	}

	async finish(): Promise<void> {
		this.connection.send({ type: 'input_audio_buffer.commit' });
	}

	async cancel(): Promise<void> {
		this.connection.close({ code: 1000, reason: 'cancelled' });
		this.emitClosed();
	}

	private handleEvent(event: RealtimeServerEvent): void {
		if (event.type === 'input_audio_buffer.committed') {
			this.emit({
				type: 'committed',
				sessionId: this.request.sessionId,
				itemId: event.item_id,
			});
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.delta') {
			this.emit({
				type: 'delta',
				sessionId: this.request.sessionId,
				itemId: event.item_id,
				contentIndex: event.content_index ?? 0,
				delta: event.delta ?? '',
			});
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.completed') {
			this.emit({
				type: 'completed',
				sessionId: this.request.sessionId,
				itemId: event.item_id,
				contentIndex: event.content_index,
				transcript: event.transcript,
			});
			this.connection.close({ code: 1000, reason: 'completed' });
			return;
		}
		if (event.type === 'conversation.item.input_audio_transcription.failed') {
			this.emitError(event.error.message ?? 'OpenAI realtime transcription failed.');
			this.connection.close({ code: 1011, reason: 'transcription failed' });
			return;
		}
		if (event.type === 'error') {
			this.emitError(event.error.message ?? 'OpenAI realtime transcription error.');
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

function realtimeModelFor(modelId: string): string {
	return modelId.includes('mini') ? 'gpt-4o-mini-realtime-preview' : 'gpt-4o-realtime-preview';
}

async function waitForOpen(connection: OpenAIRealtimeWS): Promise<void> {
	if (connection.socket.readyState === connection.socket.OPEN) return;
	await new Promise<void>((resolve, reject) => {
		connection.socket.once('open', resolve);
		connection.socket.once('error', reject);
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
