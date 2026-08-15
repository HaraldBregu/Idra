import type { SessionState } from '../session';
import type { AgentRunRecord } from './types';

export function beginRun(record: AgentRunRecord, session: SessionState): boolean {
	if (record.lifecycle.status !== 'queued') return false;
	record.lifecycle = { status: 'running', session };
	return true;
}
