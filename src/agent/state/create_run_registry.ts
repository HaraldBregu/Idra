import type { AgentRunRegistry } from './types';

export function createRunRegistry<TOptions>(): AgentRunRegistry<TOptions> {
	return new Map();
}
