import { synthesize as synthesizeTextToSpeech } from '../models/tts';
import type {
	SpeechSynthesisRequest,
	SpeechSynthesisResult,
} from '../../shared/speech.types';

export async function synthesize(
	request: SpeechSynthesisRequest
): Promise<SpeechSynthesisResult> {
	return synthesizeTextToSpeech(request);
}
