import { Provider } from "./providers";
import type { AgentsHeartbeatConfig } from './heartbeat';

export interface Service {
	agent?: Agent;
	speechTranscriber?: Agent;
	agents?: AgentsHeartbeatConfig;
	rag: string;
	ocr: string;
}

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

export function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

const GPT_5_4_MINI_REASONING_EFFORTS = MODEL_REASONING_EFFORTS.filter(
	(effort) => effort !== 'minimal'
);

export function getModelReasoningEfforts(modelId: string): readonly ModelReasoningEffort[] {
	const normalizedModelId = modelId.trim().toLowerCase();
	if (normalizedModelId === 'gpt-5.4-mini') return GPT_5_4_MINI_REASONING_EFFORTS;
	return MODEL_REASONING_EFFORTS;
}

export function getDefaultModelReasoningEffort(modelId: string): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId);
	return supportedEfforts.includes(DEFAULT_MODEL_REASONING_EFFORT)
		? DEFAULT_MODEL_REASONING_EFFORT
		: supportedEfforts[0] ?? DEFAULT_MODEL_REASONING_EFFORT;
}

export function isModelReasoningEffortSupported(
	modelId: string,
	effort: unknown
): effort is ModelReasoningEffort {
	return isModelReasoningEffort(effort) && getModelReasoningEfforts(modelId).includes(effort);
}

export function normalizeModelReasoningEffort(
	modelId: string,
	effort: unknown
): ModelReasoningEffort {
	if (isModelReasoningEffortSupported(modelId, effort)) return effort;
	return getDefaultModelReasoningEffort(modelId);
}

export function requireModelReasoningEffort(
	modelId: string,
	effort: unknown
): ModelReasoningEffort {
	const supportedEfforts = getModelReasoningEfforts(modelId);
	if (effort === undefined || effort === null || effort === '') {
		return getDefaultModelReasoningEffort(modelId);
	}
	if (isModelReasoningEffortSupported(modelId, effort)) return effort;
	throw new Error(
		`Reasoning effort "${String(effort)}" is not supported for model "${modelId}". Supported values are: ${supportedEfforts.join(', ')}.`
	);
}

export interface Model {
	id: string;
	name: string;
	effort?: ModelReasoningEffort;
}

export const SPEECH_TRANSCRIBER_AGENT_ID = 'speech-to-text';
export const SPEECH_TRANSCRIBER_PROVIDER_ID = 'openai';
export const SPEECH_TRANSCRIBER_MODELS = [
	{ id: 'whisper-large-v3', name: 'Whisper Large v3' },
] satisfies readonly Model[];

export interface Agent {
	provider: Omit<Provider, "apiKey">;
	model: Model;
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
