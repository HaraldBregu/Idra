import type { REALTIME_TRANSCRIPTION_SAMPLE_RATE } from './service';

export interface RealtimeTranscriptionStartRequest {
	language?: string;
}

export interface RealtimeTranscriptionSession {
	id: string;
	model: string;
	sampleRate: typeof REALTIME_TRANSCRIPTION_SAMPLE_RATE;
}

export type RealtimeTranscriptionEvent =
	| {
			type: 'started';
			sessionId: string;
			model: string;
	  }
	| {
			type: 'delta';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			delta: string;
	  }
	| {
			type: 'committed';
			sessionId: string;
			itemId: string;
	  }
	| {
			type: 'completed';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			transcript: string;
	  }
	| {
			type: 'error';
			sessionId?: string;
			message: string;
	  }
	| {
			type: 'closed';
			sessionId: string;
	  };
