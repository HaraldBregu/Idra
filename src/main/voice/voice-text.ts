import type { SttService } from '../models/stt/service';
import type { VoiceToTextRequest } from './voice-types';

export async function toText(stt: SttService, request: VoiceToTextRequest): Promise<string> {
	const result = await stt.transcribe(request);
	return result.text;
}
