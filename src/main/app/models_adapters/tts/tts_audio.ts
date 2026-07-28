import { SpeechProviderAuthError, SpeechProviderRequestError } from './tts_errors';
import type { SpeechAdapterRequest, SpeechProviderSpec } from './tts_types';
import type { SpeechSynthesisResult } from '../../../../shared/speech_types';

export async function ensureSpeechResponseOk(
	response: Response,
	providerName: string
): Promise<void> {
	if (response.status === 401 || response.status === 403) {
		throw new SpeechProviderAuthError(`${providerName}: ${await response.text()}`);
	}
	if (!response.ok) {
		throw new SpeechProviderRequestError(`${providerName}: ${await response.text()}`);
	}
}

export async function responseAudioToBase64(response: Response): Promise<string> {
	return Buffer.from(await response.arrayBuffer()).toString('base64');
}

export function speechResult(
	audio: string,
	mimeType: string,
	provider: SpeechProviderSpec,
	request: SpeechAdapterRequest
): SpeechSynthesisResult {
	return {
		audio,
		mimeType,
		metadata: {
			providerId: provider.id,
			providerName: provider.name,
			modelId: request.modelId,
			createdAt: new Date().toISOString(),
		},
	};
}
