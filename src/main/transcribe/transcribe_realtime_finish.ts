import { finishRealtime as sttFinishRealtime } from '../models/stt';

export async function finishRealtime(sessionId: string): Promise<void> {
	return sttFinishRealtime(sessionId);
}
