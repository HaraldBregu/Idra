import {
	hasDefaultProviderCapability,
	providerHasImageCapability,
	type Provider,
} from './providers';
import type { AgentsHeartbeatConfig } from './heartbeat';

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
const DEFAULT_DEEPSEEK_REASONING_EFFORT: ModelReasoningEffort = 'high';
const DEEPSEEK_REASONING_EFFORTS = ['none', 'high', 'xhigh'] as const;

export function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

const GPT_5_4_MINI_REASONING_EFFORTS = MODEL_REASONING_EFFORTS.filter(
	(effort) => effort !== 'minimal'
);

function isDeepSeekReasoningTarget(modelId: string, providerId?: string): boolean {
	const normalizedProviderId = providerId?.trim().toLowerCase();
	if (normalizedProviderId === 'deepseek') return true;
	return modelId.trim().toLowerCase().startsWith('deepseek-');
}

export function getModelReasoningEfforts(
	modelId: string,
	providerId?: string
): readonly ModelReasoningEffort[] {
	if (isDeepSeekReasoningTarget(modelId, providerId)) return DEEPSEEK_REASONING_EFFORTS;
	const normalizedModelId = modelId.trim().toLowerCase();
	if (normalizedModelId === 'gpt-5.4-mini') return GPT_5_4_MINI_REASONING_EFFORTS;
	return MODEL_REASONING_EFFORTS;
}

export function getDefaultModelReasoningEffort(
	modelId: string,
	providerId?: string
): ModelReasoningEffort {
	if (isDeepSeekReasoningTarget(modelId, providerId)) return DEFAULT_DEEPSEEK_REASONING_EFFORT;
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

export const ASSISTANT_OPERATOR_ID = 'friday';
export const ASSISTANT_RUNTIME_ID = 'main';
export const SPEECH_TO_TEXT_OPERATOR_ID = 'speech-to-text';
export const SPEECH_TRANSCRIBER_PROVIDER_ID = 'openai';
export const REALTIME_SPEECH_TRANSCRIBER_MODEL_ID = 'gpt-realtime-whisper';
export const REALTIME_TRANSCRIPTION_SAMPLE_RATE = 24000;
export const SPEECH_TO_TEXT_MODELS = [
	{ id: REALTIME_SPEECH_TRANSCRIBER_MODEL_ID, name: 'GPT Realtime Whisper' },
] satisfies readonly Model[];
export const SPEECH_TO_TEXT_MODELS_BY_PROVIDER = {
	openai: SPEECH_TO_TEXT_MODELS,
} as const satisfies Readonly<Record<string, readonly Model[]>>;
export const TEXT_TO_SPEECH_OPERATOR_ID = 'text-to-speech';
export const TEXT_TO_SPEECH_PROVIDER_ID = 'elevenlabs';
export const TEXT_TO_SPEECH_MODELS = [
	{ id: 'rachel-multilingual', name: 'Rachel - multilingual' },
] satisfies readonly Model[];
export const IMAGE_CREATOR_OPERATOR_ID = 'image-assistant';
export const IMAGE_CREATOR_MODELS = [
	{ id: 'image-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly Model[];
export const TEXT_TO_VIDEO_OPERATOR_ID = 'text-to-video';
export const TEXT_TO_VIDEO_MODELS = [
	{ id: 'video-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly Model[];
/** @deprecated Use TEXT_TO_VIDEO_OPERATOR_ID. */
export const VIDEO_CREATOR_OPERATOR_ID = TEXT_TO_VIDEO_OPERATOR_ID;
/** @deprecated Use TEXT_TO_VIDEO_MODELS. */
export const VIDEO_CREATOR_MODELS = TEXT_TO_VIDEO_MODELS;
export const MUSIC_CREATOR_OPERATOR_ID = 'music-creator';
export const MUSIC_CREATOR_MODELS = [
	{ id: 'music-provider-coming-soon', name: 'Not available yet' },
] satisfies readonly Model[];
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
		docsPath: 'agent.md',
		status: 'implemented',
	},
	speechToText: {
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		name: 'Speech to text',
		docsPath: 'speech-to-text.md',
		status: 'implemented',
	},
	textToSpeech: {
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		name: 'Text to speech',
		docsPath: 'text-to-speech.md',
		status: 'pending-runtime',
	},
	imageCreator: {
		id: IMAGE_CREATOR_OPERATOR_ID,
		name: 'Image creator',
		docsPath: 'text-to-image.md',
		status: 'pending-runtime',
	},
	videoCreator: {
		id: TEXT_TO_VIDEO_OPERATOR_ID,
		name: 'Text to video',
		docsPath: 'text-to-video.md',
		status: 'pending-runtime',
	},
	musicCreator: {
		id: MUSIC_CREATOR_OPERATOR_ID,
		name: 'Music creator',
		docsPath: 'music-creator.md',
		status: 'pending-runtime',
	},
	documentReaderOcr: {
		id: DOCUMENT_READER_OCR_OPERATOR_ID,
		name: 'Document reader OCR',
		docsPath: 'ocr.md',
		status: 'pending-runtime',
	},
	cronTaskScheduler: {
		id: CRON_TASK_SCHEDULER_OPERATOR_ID,
		name: 'Cron task scheduler',
		docsPath: 'task-scheduler.md',
		status: 'implemented',
	},
	backgroundTask: {
		id: BACKGROUND_TASK_OPERATOR_ID,
		name: 'Background task',
		docsPath: 'background-task.md',
		status: 'implemented',
		registeredTaskTypes: ['agent.run', 'ocr.run', 'image.create'],
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
	return modelId.trim() === REALTIME_SPEECH_TRANSCRIBER_MODEL_ID;
}

function normalizeSpeechToTextProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getSpeechToTextModels(providerId: string): Model[] {
	return (SPEECH_TO_TEXT_MODELS_BY_PROVIDER[normalizeSpeechToTextProviderId(providerId)] ?? []).map(
		(model) => ({ ...model })
	);
}

export function hasSpeechToTextModels(providerId: string): boolean {
	return getSpeechToTextModels(providerId).length > 0;
}

export function isAllowedSpeechToTextModel(providerId: string, modelId: string): boolean {
	const normalizedModelId = modelId.trim();
	return getSpeechToTextModels(providerId).some((model) => model.id === normalizedModelId);
}

export function getImageCreatorModelsForProvider(
	provider: Pick<Provider, 'id' | 'capabilities'>
): Model[] {
	if (!providerHasImageCapability(provider)) return [];
	return IMAGE_CREATOR_MODELS.map((model) => ({ ...model }));
}

export function getImageCreatorModels(providerId: string): Model[] {
	if (!hasDefaultProviderCapability(providerId, 'Image')) return [];
	return IMAGE_CREATOR_MODELS.map((model) => ({ ...model }));
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

export function isEndpointOperator(
	operator: ModelOperator | EndpointOperator | undefined
): operator is EndpointOperator {
	return Boolean(operator && 'endpoint' in operator);
}

export type ApprovalDecision = 'allow-once' | 'allow-always' | 'deny';

export type AgentRunState =
	| 'idle'
	| 'thinking'
	| 'reasoning'
	| 'using_tools'
	| 'waiting_for_approval'
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

export type AgentToolCallStatus = 'ok' | 'error' | 'rejected';

export type AgentResponseEvent =
	| {
			type: 'run_state';
			agentId: string;
			runId: string;
			state: AgentRunState;
			label?: string;
	  }
	| {
			type: 'reasoning_summary';
			agentId: string;
			runId: string;
			id: string;
			title: string;
			summary: string;
			state: ReasoningSummaryState;
	  }
	| {
			type: 'text_delta';
			agentId: string;
			runId: string;
			delta: string;
	  }
	| {
			type: 'tool_call_start';
			agentId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
	  }
	| {
			type: 'tool_call_args_delta';
			agentId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			jsonDelta: string;
			argsText: string;
	  }
	| {
			type: 'tool_call_input';
			agentId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			argsText: string;
	  }
	| {
			type: 'tool_call_result';
			agentId: string;
			runId: string;
			iteration: number;
			toolCallId: string;
			toolName: string;
			input: unknown;
			output: unknown;
			outputText: string;
			status: AgentToolCallStatus;
			durationMs: number;
			errorText?: string;
	  };

export type AgentResponseDelta = Extract<AgentResponseEvent, { type: 'text_delta' }>;

export interface AgentPendingApproval {
	id: string;
	kind: 'exec' | 'plugin' | 'api' | 'tool';
	toolName: string;
	runId?: string;
	toolCallId?: string;
	question: string;
	title: string;
	description?: string;
	argsPreview?: unknown;
	derivedPaths?: string[];
	command?: string;
	cwd?: string;
	envKeys?: string[];
	createdAtMs: number;
	expiresAtMs: number;
	allowedDecisions: ApprovalDecision[];
}

export interface AgentPendingInput {
	id: string;
	question: string;
	suggestions?: string[];
}

export interface AgentPendingState {
	approvals: AgentPendingApproval[];
	inputs: AgentPendingInput[];
}

export interface AgentPendingEventPayload extends AgentPendingState {
	agentId: string;
}

export type AgentStartupFileName =
	| 'AGENTS.md'
	| 'SOUL.md'
	| 'TOOLS.md'
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
