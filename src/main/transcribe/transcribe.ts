import type { SttService } from '../models/stt/service';
import type { SttTranscriptionResult, VoiceToTextRequest } from './voice_types';

export async function transcribe(
	stt: SttService,
	request: VoiceToTextRequest
): Promise<SttTranscriptionResult> {
	return stt.transcribe(request);
}
