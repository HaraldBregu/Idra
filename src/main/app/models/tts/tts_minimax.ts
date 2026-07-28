import { ensureSpeechResponseOk, speechResult } from './tts_audio';
import { SpeechProviderAuthError, SpeechProviderRequestError } from './tts_errors';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

const MINIMAX_TTS_PATH = 't2a_v2';
const MINIMAX_DEFAULT_VOICE_ID = 'English_expressive_narrator';

type MiniMaxTtsResponse = {
	data?: { audio?: string };
	base_resp?: { status_code?: number; status_msg?: string };
};

export function createMiniMaxSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const response = await fetch(new URL(MINIMAX_TTS_PATH, `${provider.baseURL}/`), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${provider.apiKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: request.modelId,
					text: request.text,
					stream: false,
					voice_setting: { voice_id: request.voice ?? MINIMAX_DEFAULT_VOICE_ID },
					audio_setting: { format: 'mp3' },
				}),
			});
			await ensureSpeechResponseOk(response, provider.name);

			const data = (await response.json()) as MiniMaxTtsResponse;
			if (data.base_resp?.status_code === 1004) {
				throw new SpeechProviderAuthError(`${provider.name}: ${data.base_resp.status_msg}`);
			}
			if (data.base_resp?.status_code !== 0 || !data.data?.audio) {
				throw new SpeechProviderRequestError(
					`${provider.name}: ${data.base_resp?.status_msg ?? 'response contained no audio.'}`
				);
			}
			const audio = Buffer.from(data.data.audio, 'hex').toString('base64');
			return speechResult(audio, 'audio/mpeg', provider, request);
		},
	};
}
