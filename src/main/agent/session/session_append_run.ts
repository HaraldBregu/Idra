import { appendFileSync } from 'node:fs';
import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { runFilePath } from './session_run_file_path';
import { stringifyRunEntry } from './session_stringify_run_entry';

export function appendRun(state: SessionState, entry: unknown): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	const serialized = stringifyRunEntry(entry);
	if (serialized) appendFileSync(runFilePath(state), `${serialized}\n`, 'utf8');
}
