import { cancelRealtime as sttCancelRealtime } from '../../app/models_adapters/stt';

export async function cancelRealtime(sessionId: string): Promise<void> {
	return sttCancelRealtime(sessionId);
}
