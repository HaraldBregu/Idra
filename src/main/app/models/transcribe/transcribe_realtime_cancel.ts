import { cancelRealtime as sttCancelRealtime } from '../adapters/stt';

export async function cancelRealtime(sessionId: string): Promise<void> {
	return sttCancelRealtime(sessionId);
}
