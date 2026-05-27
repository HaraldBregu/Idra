import {
	hasDefaultProviderCapability,
	providerHasImageCapability,
	type Provider,
} from '../providers';
import type { AgentsHeartbeatConfig } from '../heartbeat';
import {
	IMAGE_CREATOR_MODELS,
	LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS,
	SPEECH_TRANSCRIBER_MODEL_IDS,
	SPEECH_TRANSCRIBER_PROVIDER_ID,
	SPEECH_TO_TEXT_MODELS,
	getMusicModelsByProvider,
	TEXT_TO_VIDEO_MODELS,
	getSpeechToTextModelsByProvider,
	getTextToImageModelsByProvider,
	getTextToSpeechModelsByProvider,
	getTextToVideoModelsByProvider,
} from '../providers';

export type OperatorStatus = 'implemented' | 'placeholder' | 'pending-runtime';

export interface OperatorBase {
	id: string;
	name: string;
	docsPath: string;
	status: OperatorStatus;
}

export interface ModelOperator extends OperatorBase {
	provider?: Omit<Provider, 'apiKey'>;
	model?: Model;
}

export interface ModelOperatorSelection {
	provider: Omit<Provider, 'apiKey'>;
	model: Model;
}

export type ConfiguredModelOperator = ModelOperator & ModelOperatorSelection;

export interface EndpointOperator extends OperatorBase {
	endpoint: string;
}

export interface SchedulerOperator extends OperatorBase {}

export interface TaskOperator extends OperatorBase {
	registeredTaskTypes: string[];
}

export interface Operator {
	assistant?: ModelOperator;
	speechToText?: ModelOperator;
	textToSpeech?: ModelOperator;
	imageCreator?: ModelOperator;
	videoCreator?: ModelOperator;
	musicCreator?: ModelOperator;
	documentReaderOcr?: ModelOperator | EndpointOperator;
	cronTaskScheduler?: SchedulerOperator;
	backgroundTask?: TaskOperator;
}

export interface OperatorStoreState extends Operator {
	agents?: AgentsHeartbeatConfig;
	rag?: string;
	ocr?: string;
	agent?: ModelOperatorSelection;
	speechTranscriber?: ModelOperatorSelection;
}

/** @deprecated Use OperatorStoreState. Persisted storage may still use the `service` key. */
export type Service = OperatorStoreState;

/** @deprecated Use ConfiguredModelOperator for operator settings selections. */
export type Agent = ModelOperatorSelection;

export const MODEL_REASONING_EFFORTS = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
] as const;
export type ModelReasoningEffort = (typeof MODEL_REASONING_EFFORTS)[number];
export const DEFAULT_MODEL_REASONING_EFFORT: ModelReasoningEffort = 'medium';
const MODEL_REASONING_EFFORT_PROVIDER_ID = 'openai';

export function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

const GPT_5_4_MINI_REASONING_EFFORTS = MODEL_REASONING_EFFORTS.filter(
	(effort) => effort !== 'minimal'
);

export function supportsModelReasoningEffortProvider(providerId: string): boolean {
	return providerId.trim().toLowerCase() === MODEL_REASONING_EFFORT_PROVIDER_ID;
}

export function getModelReasoningEfforts(
	modelId: string,
	providerId?: string
): readonly ModelReasoningEffort[] {
	if (providerId !== undefined && !supportsModelReasoningEffortProvider(providerId)) return [];
	const normalizedModelId = modelId.trim().toLowerCase();
	if (normalizedModelId === 'gpt-5.4-mini') return GPT_5_4_MINI_REASONING_EFFORTS;
	return MODEL_REASONING_EFFORTS;
}

export function getDefaultModelReasoningEffort(
	modelId: string,
	providerId?: string
): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId, providerId);
	return supportedEfforts.includes(DEFAULT_MODEL_REASONING_EFFORT)
		? DEFAULT_MODEL_REASONING_EFFORT
		: (supportedEfforts[0] ?? DEFAULT_MODEL_REASONING_EFFORT);
}

export function isModelReasoningEffortSupported(
	modelId: string,
	effort: unknown,
	providerId?: string
): effort is ModelReasoningEffort {
	return (
		isModelReasoningEffort(effort) && getModelReasoningEfforts(modelId, providerId).includes(effort)
	);
}

export function requireModelReasoningEffort(
	modelId: string,
	effort: unknown,
	providerId?: string
): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId, providerId);
	if (supportedEfforts.length === 0) {
		throw new Error(`Reasoning effort is not supported for provider "${providerId ?? ''}".`);
	}
	if (effort === undefined || effort === null || effort === '') {
		return getDefaultModelReasoningEffort(modelId, providerId);
	}
	if (isModelReasoningEffortSupported(modelId, effort, providerId)) return effort;
	throw new Error(
		`Reasoning effort "${String(effort)}" is not supported for model "${modelId}". Supported values are: ${supportedEfforts.join(', ')}.`
	);
}

export interface Model {
	id: string;
	name: string;
	effort?: ModelReasoningEffort;
}

export interface AgentSendRuntimeOptions {
	readonly runId?: string;
	readonly sessionId?: string;
	/** @deprecated Use sessionId. */
	readonly agentRuntime?: string;
	readonly providerId?: string;
	readonly model?: string;
	readonly effort?: ModelReasoningEffort;
	readonly lightContext?: boolean;
	readonly toolsAllow?: readonly string[];
	readonly toolsDeny?: readonly string[];
}

export const ASSISTANT_OPERATOR_ID = 'friday';
export const ASSISTANT_RUNTIME_ID = 'main';
export const SPEECH_TO_TEXT_OPERATOR_ID = 'speech-to-text';
export const REALTIME_TRANSCRIPTION_SAMPLE_RATE = 24000;
export const TEXT_TO_SPEECH_OPERATOR_ID = 'text-to-speech';
export const IMAGE_CREATOR_OPERATOR_ID = 'image-assistant';
export const TEXT_TO_VIDEO_OPERATOR_ID = 'text-to-video';
/** @deprecated Use TEXT_TO_VIDEO_OPERATOR_ID. */
export const VIDEO_CREATOR_OPERATOR_ID = TEXT_TO_VIDEO_OPERATOR_ID;
/** @deprecated Use TEXT_TO_VIDEO_MODELS. */
export const VIDEO_CREATOR_MODELS = TEXT_TO_VIDEO_MODELS;
export const MUSIC_CREATOR_OPERATOR_ID = 'music-creator';
export const DOCUMENT_READER_OCR_OPERATOR_ID = 'document-reader';
export const DOCUMENT_READER_OCR_MODELS = [
	{ id: 'document-reader-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly Model[];
export const CRON_TASK_SCHEDULER_OPERATOR_ID = 'cron-task-scheduler';
export const BACKGROUND_TASK_OPERATOR_ID = 'background-task';

export const OPERATOR_DEFINITIONS = {
	assistant: {
		id: ASSISTANT_OPERATOR_ID,
		name: 'Assistant',
		docsPath: 'models/large-language-model.md',
		status: 'implemented',
	},
	speechToText: {
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		name: 'Speech to text',
		docsPath: 'models/speech-to-text.md',
		status: 'implemented',
	},
	textToSpeech: {
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		name: 'Text to speech',
		docsPath: 'models/text-to-speech.md',
		status: 'pending-runtime',
	},
	imageCreator: {
		id: IMAGE_CREATOR_OPERATOR_ID,
		name: 'Text to image',
		docsPath: 'models/text-to-image.md',
		status: 'pending-runtime',
	},
	videoCreator: {
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		name: 'Text to video',
		docsPath: 'models/text-to-video.md',
		status: 'pending-runtime',
	},
	musicCreator: {
		id: MUSIC_CREATOR_OPERATOR_ID,
		name: 'Text to audio',
		docsPath: 'models/music-creator.md',
		status: 'pending-runtime',
	},
	documentReaderOcr: {
		id: DOCUMENT_READER_OCR_OPERATOR_ID,
		name: 'Document reader OCR',
		docsPath: 'models/ocr.md',
		status: 'pending-runtime',
	},
	cronTaskScheduler: {
		id: CRON_TASK_SCHEDULER_OPERATOR_ID,
		name: 'Cron task scheduler',
		docsPath: 'tasks/scheduled.md',
		status: 'implemented',
	},
	backgroundTask: {
		id: BACKGROUND_TASK_OPERATOR_ID,
		name: 'Background task',
		docsPath: 'tasks/background.md',
		status: 'implemented',
		registeredTaskTypes: ['agent.run'],
	},
} as const satisfies {
	assistant: OperatorBase;
	speechToText: OperatorBase;
	textToSpeech: OperatorBase;
	imageCreator: OperatorBase;
	videoCreator: OperatorBase;
	musicCreator: OperatorBase;
	documentReaderOcr: OperatorBase;
	cronTaskScheduler: SchedulerOperator;
	backgroundTask: TaskOperator;
};

/** @deprecated Use SPEECH_TO_TEXT_OPERATOR_ID. */
export const SPEECH_TRANSCRIBER_AGENT_ID = SPEECH_TO_TEXT_OPERATOR_ID;
/** @deprecated Use SPEECH_TO_TEXT_MODELS. */
export const SPEECH_TRANSCRIBER_MODELS = SPEECH_TO_TEXT_MODELS;
/** @deprecated Use TEXT_TO_SPEECH_OPERATOR_ID. */
export const TEXT_TO_SPEECH_AGENT_ID = TEXT_TO_SPEECH_OPERATOR_ID;
/** @deprecated Use IMAGE_CREATOR_OPERATOR_ID. */
export const IMAGE_ASSISTANT_AGENT_ID = IMAGE_CREATOR_OPERATOR_ID;
/** @deprecated Use IMAGE_CREATOR_MODELS. */
export const IMAGE_ASSISTANT_MODELS = IMAGE_CREATOR_MODELS;
/** @deprecated Use TEXT_TO_VIDEO_OPERATOR_ID. */
export const VIDEO_CREATOR_AGENT_ID = TEXT_TO_VIDEO_OPERATOR_ID;
/** @deprecated Use MUSIC_CREATOR_OPERATOR_ID. */
export const MUSIC_CREATOR_AGENT_ID = MUSIC_CREATOR_OPERATOR_ID;
/** @deprecated Use DOCUMENT_READER_OCR_OPERATOR_ID. */
export const DOCUMENT_READER_AGENT_ID = DOCUMENT_READER_OCR_OPERATOR_ID;
/** @deprecated Use DOCUMENT_READER_OCR_MODELS. */
export const DOCUMENT_READER_MODELS = DOCUMENT_READER_OCR_MODELS;

export function isRealtimeSpeechTranscriberModel(modelId: string): boolean {
	return (SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(modelId.trim());
}

export function getSpeechToTextModels(providerId: string): Model[] {
	return getSpeechToTextModelsByProvider(providerId);
}

export function hasSpeechToTextModels(providerId: string): boolean {
	return getSpeechToTextModels(providerId).length > 0;
}

export function isAllowedSpeechToTextModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	if (
		providerId.trim().toLowerCase() === SPEECH_TRANSCRIBER_PROVIDER_ID &&
		(LEGACY_SPEECH_TRANSCRIBER_MODEL_IDS as readonly string[]).includes(normalizedModelId)
	) {
		return true;
	}
	return getSpeechToTextModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getTextToSpeechModels(providerId: string): Model[] {
	return getTextToSpeechModelsByProvider(providerId);
}

export function isAllowedTextToSpeechModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getTextToSpeechModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getImageCreatorModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	if (!providerHasImageCapability(provider)) return [];
	const catalogModels = getTextToImageModelsByProvider(provider.id);
	return catalogModels.length > 0
		? catalogModels
		: IMAGE_CREATOR_MODELS.map((model) => ({ ...model }));
}

export function getImageCreatorModels(providerId: string): Model[] {
	if (!hasDefaultProviderCapability(providerId, 'Image')) return [];
	return getTextToImageModelsByProvider(providerId);
}

export function hasImageCreatorModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): boolean {
	return getImageCreatorModelsForProvider(provider).length > 0;
}

export function isAllowedImageCreatorModelForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>,
	modelId: string
): boolean {
	const normalizedModelId = modelId.trim();
	return getImageCreatorModelsForProvider(provider).some((model) => model.id === normalizedModelId);
}

export function getTextToVideoModels(providerId: string): Model[] {
	return getTextToVideoModelsByProvider(providerId);
}

export function isAllowedTextToVideoModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getTextToVideoModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getMusicCreatorModels(providerId: string): Model[] {
	return getMusicModelsByProvider(providerId);
}

export function isAllowedMusicCreatorModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getMusicCreatorModels(providerId).some((model) => model.id === normalizedModelId);
}

export function isEndpointOperator(
	operator: ModelOperator | EndpointOperator | undefined
): operator is EndpointOperator {
	return Boolean(operator && 'endpoint' in operator);
}

export type AgentRunState =
	| 'idle'
	| 'thinking'
	| 'reasoning'
	| 'using_tools'
	| 'answering'
	| 'completed'
	| 'cancelled'
	| 'error';

export type ReasoningSummaryState = 'pending' | 'running' | 'completed' | 'error';

export type AgentHistoryContentBlock =
	| { type: 'text'; text: string }
	| {
			type: 'tool_use';
			toolUseId: string;
			toolName: string;
			toolArgs: unknown;
	  };

/**
 * Renderer-facing agent history converted from the provider-neutral
 * transcript. Agent entries carry text plus original blocks so restored
 * UI state and future provider turns do not depend on flattened display text.
 */
export type AgentHistoryMessage =
	| { role: 'user'; content: string }
	| {
			role: 'assistant';
			content: string | null;
			contentBlocks: AgentHistoryContentBlock[];
	  }
	| {
			role: 'tool';
			toolUseId: string;
			content: string;
			isError?: boolean;
			status?: AgentToolCallStatus;
			output?: unknown;
	  };

export type AgentToolCallStatus = import('./events').AgentToolResultStatus;
export type AgentResponseEvent = import('./events').AgentResponseEvent;
export type AgentResponseDelta = Extract<AgentResponseEvent, { type: 'text_delta' }>;




export type AgentStartupFileName =
	| 'AGENTS.md'
	| 'SOUL.md'
	| 'IDENTITY.md'
	| 'USER.md'
	| 'HEARTBEAT.md'
	| 'BOOTSTRAP.md'
	| 'MEMORY.md';

export interface AgentStartupFileSummary {
	name: AgentStartupFileName;
	path: string;
	missing: boolean;
	size?: number;
}

export interface AgentStartupFileContent extends AgentStartupFileSummary {
	content?: string;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
}

export type WorkspaceFileName = AgentStartupFileName;
export type WorkspaceFileSummary = AgentStartupFileSummary;
export type WorkspaceFileContent = AgentStartupFileContent;
