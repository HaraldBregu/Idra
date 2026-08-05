import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

const DEEPGRAM_TTS_PATH = 'speak';
const DEEPGRAM_DEFAULT_VOICE = 'thalia';

export function createDeepgramSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const endpoint = new URL(DEEPGRAM_TTS_PATH, `${provider.baseURL}/`);
			endpoint.searchParams.set(
				'model',
				`${request.modelId}-${request.voice ?? DEEPGRAM_DEFAULT_VOICE}-en`
			);
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					Authorization: `Token ${provider.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text: request.text }),
			});
			await ensureSpeechResponseOk(response, provider.name);
			return speechResult(await responseAudioToBase64(response), 'audio/mpeg', provider, request);
		},
	};
}
