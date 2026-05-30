import { MODEL_CAPABILITIES, type ModelCapability } from '../providers/models';

export const ASSISTANT_AGENT_ID = 'assistant';
export const DOCUMENT_READER_AGENT_ID = 'document-reader';

export const LLM_AGENT_ID = 'llm' satisfies ModelCapability;
export const RESEARCH_CHAT_AGENT_ID = 'research-chat' satisfies ModelCapability;
export const SPEECH_TO_TEXT_AGENT_ID = 'speech-to-text' satisfies ModelCapability;
export const TEXT_TO_SPEECH_AGENT_ID = 'text-to-speech' satisfies ModelCapability;
export const REALTIME_VOICE_AGENT_ID = 'realtime-voice' satisfies ModelCapability;
export const TEXT_TO_IMAGE_AGENT_ID = 'text-to-image' satisfies ModelCapability;
export const TEXT_TO_VIDEO_AGENT_ID = 'text-to-video' satisfies ModelCapability;
export const TEXT_TO_AUDIO_AGENT_ID = 'text-to-audio' satisfies ModelCapability;
export const MUSIC_AGENT_ID = 'music' satisfies ModelCapability;
export const THREE_D_AGENT_ID = '3d' satisfies ModelCapability;
export const EMBEDDING_AGENT_ID = 'embedding' satisfies ModelCapability;

export const APP_AGENT_IDS = [
	ASSISTANT_AGENT_ID,
	DOCUMENT_READER_AGENT_ID,
] as const;
export const PROVIDER_BACKED_AGENT_IDS = MODEL_CAPABILITIES;

export type AppAgentId = (typeof APP_AGENT_IDS)[number];
export type ProviderBackedAgentId = ModelCapability;
export type AgentId = AppAgentId | ProviderBackedAgentId;

export const AGENT_IDS = [
	ASSISTANT_AGENT_ID,
	...PROVIDER_BACKED_AGENT_IDS,
	DOCUMENT_READER_AGENT_ID,
] as const satisfies readonly AgentId[];

export const AGENTS = {
	assistant: ASSISTANT_AGENT_ID,
	llm: LLM_AGENT_ID,
	researchChat: RESEARCH_CHAT_AGENT_ID,
	speechToText: SPEECH_TO_TEXT_AGENT_ID,
	textToSpeech: TEXT_TO_SPEECH_AGENT_ID,
	realtimeVoice: REALTIME_VOICE_AGENT_ID,
	textToImage: TEXT_TO_IMAGE_AGENT_ID,
	textToVideo: TEXT_TO_VIDEO_AGENT_ID,
	textToAudio: TEXT_TO_AUDIO_AGENT_ID,
	music: MUSIC_AGENT_ID,
	threeD: THREE_D_AGENT_ID,
	embedding: EMBEDDING_AGENT_ID,
	documentReader: DOCUMENT_READER_AGENT_ID,
} as const satisfies Record<string, AgentId>;
