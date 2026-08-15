import { appendRun } from './append_run';
import type { SessionState } from './types';

export function tryAppendRun(state: SessionState, entry: unknown): void {
	try {
		appendRun(state, entry);
	} catch {
		return;
	}
}
