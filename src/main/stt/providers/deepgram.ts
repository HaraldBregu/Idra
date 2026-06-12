import { createAudioFile } from '../audio';
import { SttProviderAuthError, SttProviderRequestError } from '../errors';
import type { SttAdapter, SttAdapterTranscriptionRequest, SttProviderSpec } from '../types';
import type { SttTranscriptionResult, SttUsage } from '../../../shared/stt/transcription';

type DeepgramTranscriptionResponse = {
	metadata?: {
		duration?: number;
	};
	results?: {
		channels?: Array<{
			alternatives?: Array<{
				transcript?: string;
			}>;
		}>;
	};
};

export interface DeepgramSttAdapterOptions extends SttProviderSpec {
	fetchFactory?: typeof fetch;
}

export class DeepgramSttAdapter implements SttAdapter {
	private readonly fetcher: typeof fetch;
	private readonly provider: SttProviderSpec;

	constructor(opts: DeepgramSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		this.fetcher = opts.fetchFactory ?? fetch;
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		const file = await createAudioFile(request.audio);
		const body = Buffer.from(await file.arrayBuffer());
		const endpoint = new URL(
			'listen',
			`${this.provider.baseURL ?? 'https://api.deepgram.com/v1'}/`
		);
		endpoint.searchParams.set('model', request.modelId);
		if (request.language) endpoint.searchParams.set('language', request.language);
		if (request.prompt) endpoint.searchParams.set('keywords', request.prompt);

		const response = await this.fetcher(endpoint, {
			method: 'POST',
			headers: {
				Authorization: `Token ${this.provider.apiKey}`,
				'Content-Type': request.audio.mimeType,
			},
			body,
			signal: request.signal,
		});
		if (response.status === 401 || response.status === 403) {
			throw new SttProviderAuthError(await response.text());
		}
		if (!response.ok) {
			throw new SttProviderRequestError(await response.text());
		}

		const data = (await response.json()) as DeepgramTranscriptionResponse;
		const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
		const usage = toUsage(data.metadata);

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
	}
}

function toUsage(metadata: DeepgramTranscriptionResponse['metadata']): SttUsage | undefined {
	if (!metadata || typeof metadata.duration !== 'number') return undefined;
	return { durationSeconds: metadata.duration };
}
