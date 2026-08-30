import { appendFileSync } from 'node:fs';
import type { SessionState } from './types';
import { ensureSession } from './ensure_session';
import { runFilePath } from './run_file_path';
import { stringifyRunEntry } from './stringify_run_entry';

const TRACE_BUFFER_SIZE = 16;

export function appendRun(state: SessionState, entry: unknown): void {
	if (!state.sessionsPath) return;
	const serialized = stringifyRunEntry(entry);
	if (!serialized) return;
	state.runTraceBuffer.push(serialized);
	const terminal =
		entry !== null &&
		typeof entry === 'object' &&
		!Array.isArray(entry) &&
		['run_finished', 'run_error'].includes(String((entry as Record<string, unknown>).type));
	if (!terminal && state.runTraceBuffer.length < TRACE_BUFFER_SIZE) return;
	ensureSession(state);
	appendFileSync(runFilePath(state), `${state.runTraceBuffer.join('\n')}\n`, {
		encoding: 'utf8',
		mode: 0o600,
	});
	state.runTraceBuffer = [];
}
