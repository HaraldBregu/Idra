import OpenAI from 'openai';
import { createAudioFile } from '../audio';
import { SttProviderAuthError } from '../errors';
import type { SttAdapter, SttAdapterTranscriptionRequest, SttProviderSpec } from '../types';
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
