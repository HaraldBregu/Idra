import type { AgentContext } from './context_types';

export interface AgentCommand<TOptions = unknown> {
	id: string;
	agentId: string;
	message: string;
	options: TOptions;
	queuedAt: number;
}

export interface AgentContextState {
	custom: AgentContext;
	pending: AgentCommand[];
	current?: AgentCommand;
}
