import { Mistral } from '@mistralai/mistralai';
import { createAudioFile } from '../audio';
import { SttProviderAuthError } from '../errors';
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
	MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID,
	SPEECH_TO_TEXT_PROVIDER_BASE_URLS,
} from '../../../shared/providers/models/stt';

type MistralTranscriptionClient = {
	audio: {
		transcriptions: {
			complete: (
				request: {
					model: string;
					file: Blob;
					language?: string;
					temperature?: number;
					stream?: false;
				},
				options?: { signal?: AbortSignal; serverURL?: string | URL }
			) => Promise<{
				text: string;
				language?: string | null;
				usage?: {
					promptTokens?: number;
					completionTokens?: number;
					totalTokens?: number;
					promptAudioSeconds?: number | null;
				};
			}>;
		};
	};
};

export interface MistralSttAdapterOptions extends SttProviderSpec {
	clientFactory?: (opts: { apiKey: string; baseURL?: string }) => MistralTranscriptionClient;
}

export class MistralSttAdapter implements SttAdapter {
	private readonly client: MistralTranscriptionClient;
	private readonly provider: SttProviderSpec;

	constructor(opts: MistralSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		const factory =
			opts.clientFactory ??
			((c) =>
				new Mistral({
					apiKey: c.apiKey,
					...(c.baseURL ? { serverURL: c.baseURL } : {}),
				}) as MistralTranscriptionClient);
		this.client = factory({ apiKey: opts.apiKey, baseURL: opts.baseURL });
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		try {
			const file = await createAudioFile(request.audio);
			const response = await this.client.audio.transcriptions.complete(
				{
					model: request.modelId,
					file,
					language: request.language,
					temperature: request.temperature,
					stream: false,
				},
				{
					signal: request.signal,
					...(this.provider.baseURL ? { serverURL: this.provider.baseURL } : {}),
				}
			);
			const usage = toUsage(response.usage);

			return {
				text: response.text,
				metadata: {
					providerId: this.provider.id,
					providerName: this.provider.name,
					modelId: request.modelId,
					...(response.language || request.language
						? { language: response.language ?? request.language }
						: {}),
					createdAt: new Date().toISOString(),
					...(usage ? { usage } : {}),
				},
			};
		} catch (error) {
			const status =
				(error as { status?: number; statusCode?: number }).status ??
				(error as { statusCode?: number }).statusCode ??
				0;
			const message = (error as Error).message ?? String(error);
			if (status === 401 || status === 403) throw new SttProviderAuthError(message);
			throw error;
		}
	}

	async startRealtime(
		request: SttAdapterRealtimeStartRequest,
		emit: SttRealtimeEventHandler
	): Promise<SttRealtimeConnection> {
		const { AudioEncoding, RealtimeTranscription } = await import(
			'@mistralai/mistralai/extra/realtime'
		);
		const client = new RealtimeTranscription({
			apiKey: this.provider.apiKey,
			serverURL: realtimeBaseUrl(this.provider.baseURL),
		});
		const connection = await client.connect(request.modelId, {
			audioFormat: {
				encoding: AudioEncoding.PcmS16le,
				sampleRate: request.sampleRate,
			},
		});
		const session = new MistralRealtimeSttConnection(
			connection as unknown as MistralRealtimeConnection,
			request,
			emit
		);
		session.listen();
		return session;
	}
}

type MistralRealtimeEvent = {
	type: string;
	text?: string;
	error?: { message?: unknown };
};

type MistralRealtimeConnection = AsyncIterable<MistralRealtimeEvent> & {
	sendAudio(audioBytes: Uint8Array | ArrayBuffer): Promise<void>;
	endAudio(): Promise<void>;
	close(code?: number, reason?: string): Promise<void>;
};

class MistralRealtimeSttConnection implements SttRealtimeConnection {
	private closed = false;
	private transcript = '';

	constructor(
		private readonly connection: MistralRealtimeConnection,
		private readonly request: SttAdapterRealtimeStartRequest,
		private readonly emit: SttRealtimeEventHandler
	) {}

	listen(): void {
		void this.readEvents();
	}

	async appendAudio(audio: string): Promise<void> {
		await this.connection.sendAudio(Buffer.from(audio, 'base64'));
	}

	async finish(): Promise<void> {
		await this.connection.endAudio();
	}

	async cancel(): Promise<void> {
		await this.connection.close(1000, 'cancelled');
		this.emitClosed();
	}

	private async readEvents(): Promise<void> {
		try {
			for await (const event of this.connection) {
				if (event.type === 'transcription.text.delta' && event.text) {
					this.transcript += event.text;
					this.emit({
						type: 'delta',
						sessionId: this.request.sessionId,
						itemId: this.request.sessionId,
						contentIndex: 0,
						delta: event.text,
					});
					continue;
				}
				if (event.type === 'transcription.done') {
					this.emit({
						type: 'completed',
						sessionId: this.request.sessionId,
						itemId: this.request.sessionId,
						contentIndex: 0,
						transcript: event.text ?? this.transcript,
					});
					await this.connection.close(1000, 'completed');
					this.emitClosed();
					return;
				}
				if (event.type === 'error') {
					this.emitError(errorMessage(event.error, 'Mistral realtime transcription error.'));
				}
			}
		} catch (error) {
			this.emitError(errorMessage(error, 'Mistral realtime transcription failed.'));
		} finally {
			this.emitClosed();
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

function realtimeBaseUrl(baseURL: string | undefined): string {
	return (baseURL ?? SPEECH_TO_TEXT_PROVIDER_BASE_URLS[MISTRAL_SPEECH_TO_TEXT_PROVIDER_ID]).replace(
		/\/v1\/?$/,
		''
	);
}

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message) return error.message;
	if (
		error &&
		typeof error === 'object' &&
		typeof (error as { message?: unknown }).message === 'string'
	) {
		return (error as { message: string }).message;
	}
	return fallback;
}

function toUsage(usage: unknown): SttUsage | undefined {
	if (!usage || typeof usage !== 'object') return undefined;
	const value = usage as {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
		promptAudioSeconds?: number | null;
	};
	const next: SttUsage = {
		...(typeof value.promptTokens === 'number' ? { inputTokens: value.promptTokens } : {}),
		...(typeof value.completionTokens === 'number'
			? { outputTokens: value.completionTokens }
			: {}),
		...(typeof value.totalTokens === 'number' ? { totalTokens: value.totalTokens } : {}),
		...(typeof value.promptAudioSeconds === 'number'
			? { durationSeconds: value.promptAudioSeconds }
			: {}),
	};
	return Object.keys(next).length > 0 ? next : undefined;
}
