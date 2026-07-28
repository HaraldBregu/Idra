import { appendRealtimeAudio as sttAppendRealtimeAudio } from '../../app/models_adapters/stt';

export async function appendRealtimeAudio(sessionId: string, audio: string): Promise<void> {
	return sttAppendRealtimeAudio(sessionId, audio);
}
