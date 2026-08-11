import type { AgentRunRecord } from './state_types';

export function cancelRun(record: AgentRunRecord, reason: Error): boolean {
	if (record.lifecycle.status === 'cancelling') return false;
	const session = record.lifecycle.status === 'running' ? record.lifecycle.session : undefined;
	record.lifecycle = {
		status: 'cancelling',
		reason,
		...(session ? { session } : {}),
	};
	record.controller.abort(reason);
	return true;
}
