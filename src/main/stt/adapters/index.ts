import type { SpeechToTextRealtimeAdapter } from '../types';
import { createDeepgramSpeechToTextAdapter } from './deepgram/realtime';
import { createElevenLabsSpeechToTextAdapter } from './elevenlabs/realtime';
import { createMistralRealtimeSpeechToTextAdapter } from './mistral/realtime';
import { createOpenAIRealtimeSpeechToTextAdapter } from './openai/realtime';
import { createQwenRealtimeSpeechToTextAdapter } from './qwen/realtime';
import { createXaiSpeechToTextAdapter } from './xai/realtime';

export * from './deepgram/realtime';
export * from './elevenlabs/realtime';
export * from './mistral/realtime';
export * from './openai/realtime';
export * from './qwen/realtime';
export * from './xai/realtime';

export function createDefaultSpeechToTextAdapters(): readonly SpeechToTextRealtimeAdapter[] {
	return [
		createOpenAIRealtimeSpeechToTextAdapter(),
		createDeepgramSpeechToTextAdapter(),
		createElevenLabsSpeechToTextAdapter(),
		createMistralRealtimeSpeechToTextAdapter(),
		createXaiSpeechToTextAdapter(),
		createQwenRealtimeSpeechToTextAdapter(),
	];
}
