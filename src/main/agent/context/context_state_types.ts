import type { AgentContext } from './context_types';

export type AgentLoopState = 'idle' | 'running' | 'cancelled' | 'error';

export type CommandStatus = 'ok' | 'error' | 'cancelled';

export interface AgentCommand<TOptions = unknown> {
	id: string;
	agentId: string;
	message: string;
	options: TOptions;
	queuedAt: number;
}

export interface CommandOutcome {
	status: CommandStatus;
	response?: string;
	error?: string;
}

export interface ExecutionRecord extends CommandOutcome {
	command: AgentCommand;
	startedAt: number;
	endedAt: number;
}

export interface AgentTaskState {
	description: string;
	turns: number;
	toolCalls: number;
}

export interface AgentExecutionState {
	phase: 'idle' | 'thinking' | 'streaming' | 'tool';
	toolName?: string;
	model?: string;
}

export interface AgentConversationState {
	sessionId?: string;
	messageCount: number;
}

export interface AgentContextState {
	loopState: AgentLoopState;
	task?: AgentTaskState;
	systemPrompt?: string;
	conversation: AgentConversationState;
	execution: AgentExecutionState;
	errors: string[];
	// ponytail: nothing retries commands today; counter is here so a retry layer has a home
	retries: number;
	interruptions: number;
	custom: AgentContext;
	pending: AgentCommand[];
	current?: AgentCommand;
	history: ExecutionRecord[];
}
