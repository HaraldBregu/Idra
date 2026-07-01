import { Service } from 'typedi';
import { SttService } from '../models/stt/service';
import type {
	VoiceRealtimeStartRequest,
	VoiceToTextRequest,
	SttRealtimeEvent,
	SttRealtimeSession,
	SttTranscriptionResult,
} from './types';

@Service()
export class VoiceService {
	constructor(private readonly stt: SttService) {}

	async toText(request: VoiceToTextRequest): Promise<string> {
		const result = await this.stt.transcribe(request);
		return result.text;
	}

	async transcribe(request: VoiceToTextRequest): Promise<SttTranscriptionResult> {
		return this.stt.transcribe(request);
	}

	async startRealtime(
		request: VoiceRealtimeStartRequest | undefined,
		onEvent: (event: SttRealtimeEvent) => void
	): Promise<SttRealtimeSession> {
		return this.stt.startRealtime(request, onEvent);
	}

	async appendRealtimeAudio(sessionId: string, audio: string): Promise<void> {
		return this.stt.appendRealtimeAudio(sessionId, audio);
	}

	async finishRealtime(sessionId: string): Promise<void> {
		return this.stt.finishRealtime(sessionId);
	}

	async cancelRealtime(sessionId: string): Promise<void> {
		return this.stt.cancelRealtime(sessionId);
	}
}
