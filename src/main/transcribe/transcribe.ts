import type { SttService } from '../models/stt/service';
import type { SttTranscriptionResult, TranscribeToTextRequest } from './transcribe_types';

export async function transcribe(
	stt: SttService,
	request: TranscribeToTextRequest
): Promise<SttTranscriptionResult> {
	return stt.transcribe(request);
}
