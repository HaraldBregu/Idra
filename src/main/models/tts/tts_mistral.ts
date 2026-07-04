import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../shared/speech_types';

const MISTRAL_TTS_PATH = 'audio/speech';

export function createMistralSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const response = await fetch(new URL(MISTRAL_TTS_PATH, `${provider.baseURL}/`), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${provider.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: request.modelId,
					input: request.text,
					...(request.voice ? { voice: request.voice } : {}),
				}),
			});
			await ensureSpeechResponseOk(response, provider.name);
			const mimeType = response.headers.get('content-type') ?? 'audio/mpeg';
			return speechResult(await responseAudioToBase64(response), mimeType, provider, request);
		},
	};
}
