import type { AgentContext } from './context_types';
import type { AgentContextState } from './context_state_types';

export function createContextState(custom: AgentContext): AgentContextState {
	return {
		loopState: 'idle',
		conversation: { messageCount: 0 },
		execution: { phase: 'idle' },
		errors: [],
		retries: 0,
		interruptions: 0,
		custom,
		pending: [],
		history: [],
	};
}
