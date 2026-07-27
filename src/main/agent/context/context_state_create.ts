import type { AgentContext } from './context_types';
import type { AgentContextState } from './context_state_types';

export function createContextState(custom: AgentContext): AgentContextState {
	return { custom, pending: [] };
}
