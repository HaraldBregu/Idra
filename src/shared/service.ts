import { Provider } from "./providers";

export interface Service {
	agent?: Agent;
	rag: string;
	ocr: string;
}

export interface Model {
	id: string;
	name: string;
}

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

export type WorkspaceFileName =
	| 'AGENTS.md'
	| 'SOUL.md'
	| 'TOOLS.md'
	| 'IDENTITY.md'
	| 'USER.md'
	| 'HEARTBEAT.md'
	| 'BOOTSTRAP.md'
	| 'MEMORY.md';

export interface WorkspaceFileSummary {
	name: WorkspaceFileName;
	path: string;
	missing: boolean;
	size?: number;
}

export interface WorkspaceFileContent extends WorkspaceFileSummary {
	content?: string;
	error?: 'missing' | 'unsafe' | 'io';
	detail?: string;
}
