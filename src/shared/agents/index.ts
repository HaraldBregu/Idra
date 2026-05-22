export const ASSISTANT_AGENT_ID = 'assistant';
export const SPEECH_TO_TEXT_AGENT_ID = 'speech-to-text';
export const TEXT_TO_SPEECH_AGENT_ID = 'text-to-speech';
export const IMAGE_ASSISTANT_AGENT_ID = 'image-assistant';
export const TEXT_TO_VIDEO_AGENT_ID = 'text-to-video';
export const MUSIC_CREATOR_AGENT_ID = 'music-creator';
export const DOCUMENT_READER_AGENT_ID = 'document-reader';

export const AGENT_IDS = [
	ASSISTANT_AGENT_ID,
	SPEECH_TO_TEXT_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
	IMAGE_ASSISTANT_AGENT_ID,
	TEXT_TO_VIDEO_AGENT_ID,
	MUSIC_CREATOR_AGENT_ID,
	DOCUMENT_READER_AGENT_ID,
] as const;

export type AgentId = (typeof AGENT_IDS)[number];

export const AGENTS = {
	assistant: ASSISTANT_AGENT_ID,
	speechToText: SPEECH_TO_TEXT_AGENT_ID,
	textToSpeech: TEXT_TO_SPEECH_AGENT_ID,
	imageAssistant: IMAGE_ASSISTANT_AGENT_ID,
	textToVideo: TEXT_TO_VIDEO_AGENT_ID,
	musicCreator: MUSIC_CREATOR_AGENT_ID,
	documentReader: DOCUMENT_READER_AGENT_ID,
} as const satisfies Record<string, AgentId>;
