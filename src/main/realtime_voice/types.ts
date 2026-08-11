import type { RealtimeClientEvent, RealtimeServerEvent } from 'openai/resources/realtime/realtime';
import type { Tool } from '../agent/types';

export const REALTIME_VOICE_MODELS = ['gpt-realtime-2.1', 'gpt-realtime-2.1-mini'] as const;

export type RealtimeVoiceModel = (typeof REALTIME_VOICE_MODELS)[number];

export interface RealtimeVoiceAdapterRequest {
	apiKey: string;
	model: RealtimeVoiceModel;
	voice: string;
	instructions: string;
	tools: Tool[];
}

export type RealtimeVoiceAdapterEvent =
	| { type: 'input_speech_started'; itemId: string }
	| { type: 'input_speech_stopped'; itemId: string }
	| { type: 'tool_call_start'; callId: string; itemId: string; responseId: string; name: string }
	| { type: 'assistant_transcript_delta'; itemId: string; responseId: string; delta: string }
	| { type: 'assistant_transcript_final'; itemId: string; responseId: string; transcript: string }
	| { type: 'assistant_audio_delta'; itemId: string; responseId: string; audio: string }
	| { type: 'assistant_audio_done'; itemId: string; responseId: string }
	| {
			type: 'tool_call_args_delta';
			callId: string;
			itemId: string;
			responseId: string;
			delta: string;
	  }
	| {
			type: 'tool_call';
			callId: string;
			itemId: string;
			responseId: string;
			name: string;
			arguments: string;
	  }
	| { type: 'error'; message: string }
	| { type: 'closed' };

export type RealtimeVoiceAdapterEventHandler = (event: RealtimeVoiceAdapterEvent) => void;

export interface RealtimeVoiceConnection {
	appendAudio(audio: string): Promise<void>;
	interrupt(): Promise<void>;
	addToolResult(callId: string, output: string): Promise<void>;
	stop(): Promise<void>;
}

export interface RealtimeVoiceAdapter {
	connect(
		request: RealtimeVoiceAdapterRequest,
		emit: RealtimeVoiceAdapterEventHandler
	): Promise<RealtimeVoiceConnection>;
}

export interface RealtimeSocket {
	readonly socket: {
		readonly readyState: number;
		on(event: 'open' | 'close', listener: (...args: unknown[]) => void): unknown;
	};
	on(event: 'event', listener: (event: RealtimeServerEvent) => void): unknown;
	on(event: 'error', listener: (error: Error) => void): unknown;
	send(event: RealtimeClientEvent): void;
	close(props?: { code: number; reason: string }): void;
}

export type RealtimeSocketFactory = (
	apiKey: string,
	model: RealtimeVoiceModel
) => RealtimeSocket;
