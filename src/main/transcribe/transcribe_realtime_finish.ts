import { finishRealtime as sttFinishRealtime } from '../app/models/stt';

export async function finishRealtime(sessionId: string): Promise<void> {
	return sttFinishRealtime(sessionId);
}
