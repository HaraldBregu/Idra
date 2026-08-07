import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

const OPENAI_TTS_PATH = 'audio/speech';
const OPENAI_DEFAULT_VOICE = 'alloy';

export function createOpenAISpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const response = await fetch(new URL(OPENAI_TTS_PATH, `${provider.baseURL}/`), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${provider.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...request.options,
					model: request.modelId,
					input: request.text,
					voice: request.voice ?? OPENAI_DEFAULT_VOICE,
					response_format: 'mp3',
				}),
			});
			await ensureSpeechResponseOk(response, provider.name);
			return speechResult(await responseAudioToBase64(response), 'audio/mpeg', provider, request);
		},
	};
}
