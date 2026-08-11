import { ensureSpeechResponseOk, responseAudioToBase64, speechResult } from './tts_audio';
import type { SpeechAdapter, SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

const CARTESIA_TTS_PATH = 'tts/bytes';
const CARTESIA_VERSION = '2026-03-01';
const CARTESIA_DEFAULT_VOICE_ID = 'a0e99841-438c-4a64-b679-ae501e7d6091';

export function createCartesiaSpeechAdapter(provider: SpeechProviderSpec): SpeechAdapter {
	return {
		async synthesize(request: SpeechAdapterRequest): Promise<SpeechSynthesisResult> {
			const {
				voice: optionVoice,
				output_format: optionOutputFormat,
				model_id: _modelId,
				transcript: _transcript,
				...options
			} = request.options ?? {};
			const voiceId =
				request.voice ??
				(optionVoice && typeof optionVoice === 'object' && !Array.isArray(optionVoice)
					? (optionVoice as Record<string, unknown>).id
					: undefined);
			const outputFormat =
				optionOutputFormat && typeof optionOutputFormat === 'object' && !Array.isArray(optionOutputFormat)
					? optionOutputFormat
					: { container: 'mp3', bit_rate: 128_000, sample_rate: 44_100 };
			const response = await fetch(new URL(CARTESIA_TTS_PATH, `${provider.baseURL}/`), {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${provider.apiKey}`,
					'Cartesia-Version': CARTESIA_VERSION,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model_id: request.modelId,
					transcript: request.text,
					voice: {
						mode: 'id',
						id: typeof voiceId === 'string' ? voiceId : CARTESIA_DEFAULT_VOICE_ID,
					},
					...options,
					output_format: outputFormat,
				}),
			});
			await ensureSpeechResponseOk(response, provider.name);
			return speechResult(
				await responseAudioToBase64(response),
				response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream',
				provider,
				request
			);
		},
	};
}
