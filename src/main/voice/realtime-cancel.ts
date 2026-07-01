import type { SttService } from '../models/stt/service';

export async function cancelRealtime(stt: SttService, sessionId: string): Promise<void> {
	return stt.cancelRealtime(sessionId);
}
