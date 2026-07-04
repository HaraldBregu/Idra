import { cancelRealtime as sttCancelRealtime } from '../models/stt';

export async function cancelRealtime(sessionId: string): Promise<void> {
	return sttCancelRealtime(sessionId);
}
