import { appendRealtimeAudio as sttAppendRealtimeAudio } from '../adapters/stt';

export async function appendRealtimeAudio(sessionId: string, audio: string): Promise<void> {
	return sttAppendRealtimeAudio(sessionId, audio);
}
