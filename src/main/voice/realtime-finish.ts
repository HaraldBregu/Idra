import type { SttService } from '../models/stt/service';

export async function finishRealtime(stt: SttService, sessionId: string): Promise<void> {
	return stt.finishRealtime(sessionId);
}
