import type { SttService } from '../models/stt/service';
import type { SttRealtimeEvent, SttRealtimeSession, VoiceRealtimeStartRequest } from './voice_types';

export async function startRealtime(
	stt: SttService,
	request: VoiceRealtimeStartRequest | undefined,
	onEvent: (event: SttRealtimeEvent) => void
): Promise<SttRealtimeSession> {
	return stt.startRealtime(request, onEvent);
}
