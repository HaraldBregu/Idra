import type { SttService } from '../models/stt/service';
import type { TranscribeToTextRequest } from './transcribe_types';

export async function toText(stt: SttService, request: TranscribeToTextRequest): Promise<string> {
	const result = await stt.transcribe(request);
	return result.text;
}
