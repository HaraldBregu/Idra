import type { SttService } from '../models/stt/service';
import type { SttRealtimeEvent, SttRealtimeSession, TranscribeRealtimeStartRequest } from './transcribe_types';

export async function startRealtime(
	stt: SttService,
	request: TranscribeRealtimeStartRequest | undefined,
	onEvent: (event: SttRealtimeEvent) => void
): Promise<SttRealtimeSession> {
	return stt.startRealtime(request, onEvent);
}
