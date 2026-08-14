import type { AgentRunRegistry } from './state_types';

export function createRunRegistry<TOptions>(): AgentRunRegistry<TOptions> {
	return new Map();
}
