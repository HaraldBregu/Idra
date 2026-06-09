import { CHAT_MODELS_BY_PROVIDER } from '../../../shared/providers/models/llm';
import { cloneModels, type ProviderModel } from '../../../shared/providers/models/types';
import type { PublicProvider } from '../../../shared/providers';
import type { Provider as StoredProvider } from '../../../shared/providers/types';
import type {
	AgentResponseEvent,
	AgentRunState,
	ModelReasoningEffort,
} from '../../../shared/agent/types';

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
export type { AgentResponseEvent, AgentRunState, ModelReasoningEffort, StoredProvider };

export interface ModelSelection {
	provider: PublicProvider;
	model: Model;
}

export type AgentToolCallStatus = 'ok' | 'error' | 'blocked' | 'rejected';

export type AgentHistoryContentBlock =
	| {
			type: 'text';
			text: string;
	  }
	| {
			type: 'tool_use';
			toolUseId: string;
			toolName: string;
			toolArgs?: unknown;
	  };

export interface AgentHistoryMessage {
	role: 'user' | 'agent' | 'assistant' | 'tool';
	content?: string | null;
	blocks?: AgentHistoryContentBlock[];
	toolUseId?: string;
	isError?: boolean;
	status?: AgentToolCallStatus;
	output?: unknown;
}

export type ConnectorInput = {
	id?: string;
	name: string;
	connectorId: string;
	serverLabel?: string;
	serverDescription?: string;
	serverUrl?: string;
	authorization?: string;
	requireApproval?: 'always' | 'never';
	deferLoading?: boolean;
	enabled?: boolean;
	createdAt?: string;
};

export type OAuthAuthorizeInput = {
	service: string;
	serviceId?: string;
	clientIdEnv: string;
	clientSecretEnv?: string;
	authorizationUrl: string;
	tokenUrl: string;
	userInfoUrl?: string;
	scopes: readonly string[];
	accessType?: string;
	prompt?: string;
};

export type RealtimeTranscriptionEvent =
	| { type: 'started'; sessionId: string; model: string }
	| { type: 'delta'; sessionId: string; itemId: string; contentIndex: number; delta: string }
	| { type: 'committed'; sessionId: string; itemId: string }
	| {
			type: 'completed';
			sessionId: string;
			itemId: string;
			contentIndex: number;
			transcript: string;
	  }
	| { type: 'error'; sessionId?: string; message: string }
	| { type: 'closed'; sessionId: string };

export type RendererAppApi = Window['app'] & {
	authorizeOAuth(input: OAuthAuthorizeInput): Promise<{ accessToken: string }>;
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
	const provider = providerId.trim().toLowerCase();
	const model = modelId.trim();
	if (provider === 'openai') return model.includes('transcribe');
	if (provider === 'deepgram') return model === 'flux';
	if (provider === 'elevenlabs') return model.includes('realtime');
	if (provider === 'mistral') return model.includes('realtime');
	if (provider === 'qwen') return model.includes('omni');
	if (provider === 'xai') return model.includes('streaming');
	return false;
}
