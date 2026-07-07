import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { sessionDir } from './session_session_dir';

export function persistSystemPrompt(
	state: SessionState,
	systemPrompt: string,
	initial: boolean,
): void {
	ensureSession(state);
	const dir = sessionDir(state);
	if (initial) writeFileSync(path.join(dir, 'initial_system.md'), `${systemPrompt}\n`, 'utf8');
	writeFileSync(path.join(dir, 'run_system.md'), `${systemPrompt}\n`, 'utf8');
}
