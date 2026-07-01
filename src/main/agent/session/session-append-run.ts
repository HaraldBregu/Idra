import { appendFileSync } from 'node:fs';
import type { SessionState } from './session-types';
import { ensureSession } from './session-ensure-session';
import { runFilePath } from './session-run-file-path';
import { stringifyRunEntry } from './session-stringify-run-entry';

export function appendRun(state: SessionState, entry: unknown): void {
	ensureSession(state);
	appendFileSync(runFilePath(state), `${stringifyRunEntry(entry)}\n`, 'utf8');
}
