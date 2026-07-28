import { synthesize as synthesizeTextToSpeech } from '../app/models/tts';
import type {
	SpeechSynthesisRequest,
	SpeechSynthesisResult,
} from '../../shared/speech_types';

export async function synthesize(
	request: SpeechSynthesisRequest
): Promise<SpeechSynthesisResult> {
	return synthesizeTextToSpeech(request);
}
