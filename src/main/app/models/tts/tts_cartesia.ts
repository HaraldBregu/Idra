import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

const CARTESIA_TTS_PATH = 'tts/bytes';
const CARTESIA_VERSION = '2025-04-16';
const CARTESIA_DEFAULT_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091';

export function createCartesiaSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const response = await fetch(new URL(CARTESIA_TTS_PATH, `${provider.baseURL}/`), {
				method: 'POST',
				headers: {
					'X-API-Key': provider.apiKey,
					'Cartesia-Version': CARTESIA_VERSION,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model_id: request.modelId,
					transcript: request.text,
					voice: { mode: 'id', id: request.voice ?? CARTESIA_DEFAULT_VOICE_ID },
					output_format: { container: 'mp3', bit_rate: 128_000, sample_rate: 44_100 },
				}),
			});
			await ensureSpeechResponseOk(response, provider.name);
			return speechResult(await responseAudioToBase64(response), 'audio/mpeg', provider, request);
		},
	};
}
