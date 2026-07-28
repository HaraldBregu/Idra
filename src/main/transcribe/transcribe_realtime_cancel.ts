import { cancelRealtime as sttCancelRealtime } from '../app/models/stt';

export async function cancelRealtime(sessionId: string): Promise<void> {
	return sttCancelRealtime(sessionId);
}
