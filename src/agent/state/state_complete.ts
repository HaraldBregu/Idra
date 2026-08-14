import type { AgentRunRecord, AgentRunRegistry } from './state_types';

export function completeRun<TOptions>(
	registry: AgentRunRegistry<TOptions>,
	record: AgentRunRecord<TOptions>
): boolean {
	if (registry.get(record.request.id) !== record) return false;
	return registry.delete(record.request.id);
}
