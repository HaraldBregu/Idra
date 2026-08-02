import { transcribe as sttTranscribe } from '../adapters/stt';
import type { TranscribeToTextRequest } from './transcribe_types';

export async function toText(request: TranscribeToTextRequest): Promise<string> {
	const result = await sttTranscribe(request);
	return result.text;
}
