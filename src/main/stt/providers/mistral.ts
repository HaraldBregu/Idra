import { Mistral } from '@mistralai/mistralai';
import { createAudioFile } from '../audio';
import { SttProviderAuthError } from '../errors';
import type { SttAdapter, SttAdapterTranscriptionRequest, SttProviderSpec } from '../types';
import type { SttTranscriptionResult, SttUsage } from '../../../shared/stt/transcription';

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
