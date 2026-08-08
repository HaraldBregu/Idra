import { appendRun } from './session_append_run';
import type { SessionState } from './session_types';

export function tryAppendRun(state: SessionState, entry: unknown): void {
	try {
		appendRun(state, entry);
	} catch {
		// Trace persistence is best-effort and must never change run lifecycle semantics.
	}
}
