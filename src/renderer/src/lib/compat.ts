import { CHAT_MODELS_BY_PROVIDER } from '../../../shared/providers/models/llm';
import { cloneModels, type ProviderModel } from '../../../shared/providers_models.types';
import { isRealtimeSpeechToTextModel as isRealtimeSpeechToTextModelFromCatalog } from '../../../shared/providers/models/stt';
import type { PublicProvider } from '../../../shared/providers';
import type { Provider as StoredProvider } from '../../../shared/providers.types';
import type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentRunState,
	AgentToolResultStatus,
	ModelReasoningEffort,
} from '../../../shared/agent.types';
import type { SttRealtimeEvent } from '../../../shared/stt/transcription';

export const AGENTS = {
	assistant: 'assistant',
	speechToText: 'speech-to-text',
	textToSpeech: 'text-to-speech',
	textToImage: 'text-to-image',
	textToVideo: 'text-to-video',
	textToAudio: 'text-to-audio',
	documentReader: 'document-reader',
	embedding: 'embedding',
} as const;

export type AgentId = (typeof AGENTS)[keyof typeof AGENTS];
export type Model = ProviderModel;
export type {
	AgentHistoryContentBlock,
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentRunState,
	ModelReasoningEffort,
	StoredProvider,
};

export interface ModelSelection {
	provider: PublicProvider;
	model: Model;
}

export type AgentToolCallStatus = AgentToolResultStatus;
export type { SttRealtimeEvent };

export type RendererAppApi = Window['app'] & {
	setProviderApiKey(providerId: string, apikey: string): Promise<void>;
	isProviderApiKeySaved(providerId: string): Promise<boolean>;
	getProviders(): Promise<PublicProvider[]>;
	getModels(provider: PublicProvider): Promise<Model[]>;
	getAgentService(): Promise<ModelSelection | undefined>;
	saveAgentService(provider: PublicProvider, model: Model): Promise<boolean>;
	getSpeechTranscriberService(): Promise<ModelSelection | undefined>;
	getSpeechToTextModels(provider: PublicProvider): Promise<Model[]>;
	saveSpeechTranscriberService(provider: PublicProvider, model: Model): Promise<boolean>;
	getTextToSpeechService(): Promise<ModelSelection | undefined>;
	getTextToSpeechModels(provider: PublicProvider): Promise<Model[]>;
	saveTextToSpeechService(provider: PublicProvider, model: Model): Promise<boolean>;
	getImageCreatorService(): Promise<ModelSelection | undefined>;
	getImageCreatorModels(provider: PublicProvider): Promise<Model[]>;
	saveImageCreatorService(provider: PublicProvider, model: Model): Promise<boolean>;
	getTextToVideoService(): Promise<ModelSelection | undefined>;
	getTextToVideoModels(provider: PublicProvider): Promise<Model[]>;
	saveTextToVideoService(provider: PublicProvider, model: Model): Promise<boolean>;
	getTextToSoundService(): Promise<ModelSelection | undefined>;
	getTextToSoundModels(provider: PublicProvider): Promise<Model[]>;
	saveTextToSoundService(provider: PublicProvider, model: Model): Promise<boolean>;
};

export const appApi = window.app as unknown as RendererAppApi;

export function getLlmModels(providerId: string): Model[] {
	return cloneModels(CHAT_MODELS_BY_PROVIDER[providerId.trim().toLowerCase()]);
}

export function isRealtimeSpeechToTextModel(providerId: string, modelId: string): boolean {
	return isRealtimeSpeechToTextModelFromCatalog(providerId, modelId);
}
