import type { SttService } from '../models/stt/service';

export async function appendRealtimeAudio(
	stt: SttService,
	sessionId: string,
	audio: string
): Promise<void> {
	return stt.appendRealtimeAudio(sessionId, audio);
}
