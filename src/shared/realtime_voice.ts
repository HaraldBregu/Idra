import type { AgentResponseEvent } from './agent_types';

export const REALTIME_VOICE_SAMPLE_RATE = 24_000 as const;
export const REALTIME_VOICE_CHANNELS = 1 as const;
export const REALTIME_VOICE_MAX_AUDIO_BASE64_LENGTH = 1_400_000;

export interface RealtimeVoiceStartRequest {
	readonly chatSessionId: string;
}

export interface RealtimeVoiceAudioFormat {
	readonly format: 'pcm16';
	readonly sampleRate: typeof REALTIME_VOICE_SAMPLE_RATE;
	readonly channels: typeof REALTIME_VOICE_CHANNELS;
}

export interface RealtimeVoiceSession {
	readonly id: string;
	readonly providerId: string;
	readonly modelId: string;
	readonly input: RealtimeVoiceAudioFormat;
	readonly output: RealtimeVoiceAudioFormat;
}

export type RealtimeVoiceState =
	| 'connecting'
	| 'listening'
	| 'thinking'
	| 'speaking'
	| 'ending';

export type RealtimeVoiceToolEvent =
	| (Extract<AgentResponseEvent, { type: 'tool_call_start' }> & {
			readonly sessionId: string;
			readonly input?: unknown;
	  })
	| (Extract<AgentResponseEvent, { type: 'tool_call_args_delta' }> & {
			readonly sessionId: string;
	  })
	| (Extract<AgentResponseEvent, { type: 'tool_call_input' }> & {
			readonly sessionId: string;
	  })
	| (Extract<AgentResponseEvent, { type: 'tool_permission_request' }> & {
			readonly sessionId: string;
	  })
	| (Extract<AgentResponseEvent, { type: 'tool_call_result' }> & {
			readonly sessionId: string;
	  });

export type RealtimeVoiceEvent =
	| {
			readonly type: 'started';
			readonly sessionId: string;
			readonly providerId: string;
			readonly modelId: string;
	  }
	| {
			readonly type: 'state';
			readonly sessionId: string;
			readonly status: RealtimeVoiceState;
	  }
	| { readonly type: 'input_speech_started'; readonly sessionId: string; readonly itemId?: string }
	| { readonly type: 'input_speech_stopped'; readonly sessionId: string; readonly itemId?: string }
	| {
			readonly type: 'user_turn';
			readonly sessionId: string;
			readonly itemId?: string;
			readonly transcript?: string;
	  }
	| {
			readonly type: 'assistant_transcript_delta';
			readonly sessionId: string;
			readonly itemId?: string;
			readonly delta: string;
	  }
	| {
			readonly type: 'assistant_transcript_final';
			readonly sessionId: string;
			readonly itemId?: string;
			readonly text: string;
	  }
	| {
			readonly type: 'assistant_audio_delta';
			readonly sessionId: string;
			readonly audio: string;
	  }
	| { readonly type: 'assistant_audio_done'; readonly sessionId: string }
	| { readonly type: 'interrupted'; readonly sessionId: string }
	| { readonly type: 'error'; readonly sessionId: string; readonly message: string }
	| { readonly type: 'closed'; readonly sessionId: string }
	| RealtimeVoiceToolEvent;
