import { createAudioFile } from '../audio';
import { SttProviderAuthError, SttProviderRequestError } from '../errors';
import type { SttAdapter, SttAdapterTranscriptionRequest, SttProviderSpec } from '../types';
import type { SttTranscriptionResult } from '../../../shared/stt/transcription';

type ElevenLabsTranscriptionResponse = {
	text?: string;
	language_code?: string;
	languageCode?: string;
};

export interface ElevenLabsSttAdapterOptions extends SttProviderSpec {
	fetchFactory?: typeof fetch;
}

export class ElevenLabsSttAdapter implements SttAdapter {
	private readonly fetcher: typeof fetch;
	private readonly provider: SttProviderSpec;

	constructor(opts: ElevenLabsSttAdapterOptions) {
		if (!opts.apiKey) throw new SttProviderAuthError(`${opts.name} API key not configured.`);
		this.provider = opts;
		this.fetcher = opts.fetchFactory ?? fetch;
	}

	async transcribe(request: SttAdapterTranscriptionRequest): Promise<SttTranscriptionResult> {
		const file = await createAudioFile(request.audio);
		const form = new FormData();
		form.append('file', file);
		form.append('model_id', request.modelId);
		if (request.language) form.append('language_code', request.language);
		if (request.prompt) form.append('prompt', request.prompt);

		const endpoint = new URL(
			'speech-to-text',
			`${this.provider.baseURL ?? 'https://api.elevenlabs.io/v1'}/`
		);
		const response = await this.fetcher(endpoint, {
			method: 'POST',
			headers: {
				'xi-api-key': this.provider.apiKey,
			},
			body: form,
			signal: request.signal,
		});
		if (response.status === 401 || response.status === 403) {
			throw new SttProviderAuthError(await response.text());
		}
		if (!response.ok) {
			throw new SttProviderRequestError(await response.text());
		}

		const data = (await response.json()) as ElevenLabsTranscriptionResponse;

		return {
			text: data.text ?? '',
			metadata: {
				providerId: this.provider.id,
				providerName: this.provider.name,
				modelId: request.modelId,
				...(data.language_code || data.languageCode || request.language
					? { language: data.language_code ?? data.languageCode ?? request.language }
					: {}),
				createdAt: new Date().toISOString(),
			},
		};
	}
}
