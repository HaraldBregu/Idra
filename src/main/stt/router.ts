import type { SpeechToTextRealtimeAdapter } from '../../../shared/speech-to-text-runtime';
import { createDeepgramSpeechToTextAdapter } from './providers/deepgram';
import { createElevenLabsSpeechToTextAdapter } from './providers/elevenlabs';
import { createMistralRealtimeSpeechToTextAdapter } from './providers/mistral';
import { createOpenAIRealtimeSpeechToTextAdapter } from './providers/openai';
import { createQwenRealtimeSpeechToTextAdapter } from './providers/qwen';
import { createXaiSpeechToTextAdapter } from './providers/xai';

export * from './providers/deepgram';
export * from './providers/elevenlabs';
export * from './providers/mistral';
export * from './providers/openai';
export * from './providers/qwen';
export * from './providers/xai';

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
