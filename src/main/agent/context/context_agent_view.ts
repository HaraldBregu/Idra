import type { AgentContextState } from './context_state_types';

export interface AgentCommandView {
	id: string;
	agentId: string;
	message: string;
}

export function agentView(state: AgentContextState): AgentCommandView {
	const command = state.current;
	if (!command) throw new Error('No current command to expose to the agent.');
	return { id: command.id, agentId: command.agentId, message: command.message };
}
