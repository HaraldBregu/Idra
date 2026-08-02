import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../../shared/speech_types';

const ELEVENLABS_TTS_PATH = 'text-to-speech';
const ELEVENLABS_API_KEY_HEADER = 'xi-api-key';
const ELEVENLABS_DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

export function createElevenLabsSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const voiceId = request.voice ?? ELEVENLABS_DEFAULT_VOICE_ID;
			const response = await fetch(
				new URL(`${ELEVENLABS_TTS_PATH}/${voiceId}`, `${provider.baseURL}/`),
				{
					method: 'POST',
					headers: {
						[ELEVENLABS_API_KEY_HEADER]: provider.apiKey,
						Accept: 'audio/mpeg',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						text: request.text,
						model_id: request.modelId,
					}),
				}
			);
			await ensureSpeechResponseOk(response, provider.name);
			return speechResult(await responseAudioToBase64(response), 'audio/mpeg', provider, request);
		},
	};
}
