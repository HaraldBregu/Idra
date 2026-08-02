import { finishRealtime as sttFinishRealtime } from '../adapters/stt';

export async function finishRealtime(sessionId: string): Promise<void> {
	return sttFinishRealtime(sessionId);
}
