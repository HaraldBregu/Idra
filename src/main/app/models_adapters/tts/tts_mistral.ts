import { Mistral } from '@mistralai/mistralai';
import { speechResult } from './tts_audio';
import { SpeechProviderRequestError } from './tts_errors';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

export function createMistralSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	const client = new Mistral({
		apiKey: provider.apiKey,
		serverURL: provider.baseURL.replace(/\/v1\/?$/, ''),
	});
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const voiceId =
				request.voice ?? (await client.audio.voices.list({ limit: 1 })).items[0]?.id;
			if (!voiceId) {
				throw new SpeechProviderRequestError(
					`${provider.name}: no voice available. Create a voice on Mistral before synthesizing speech.`
				);
			}
			const response = await client.audio.speech.complete({
				model: request.modelId,
				input: request.text,
				voiceId,
				responseFormat: 'mp3',
				stream: false,
			});
			return speechResult(response.audioData, 'audio/mpeg', provider, request);
		},
	};
}
