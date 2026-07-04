import { transcribe as sttTranscribe } from '../models/stt';
import type { SttTranscriptionResult, TranscribeToTextRequest } from './transcribe_types';

export async function transcribe(
	request: TranscribeToTextRequest
): Promise<SttTranscriptionResult> {
	return sttTranscribe(request);
}
