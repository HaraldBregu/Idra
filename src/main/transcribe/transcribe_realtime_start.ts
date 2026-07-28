import { startRealtime as sttStartRealtime } from '../app/models/stt';
import type { SttRealtimeEvent, SttRealtimeSession, TranscribeRealtimeStartRequest } from './transcribe_types';

export async function startRealtime(
	request: TranscribeRealtimeStartRequest | undefined,
	onEvent: (event: SttRealtimeEvent) => void
): Promise<SttRealtimeSession> {
	return sttStartRealtime(request, onEvent);
}
