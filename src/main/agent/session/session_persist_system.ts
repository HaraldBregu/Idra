import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { sessionDir } from './session_session_dir';

export function persistSystemPrompt(state: SessionState, systemPrompt: string): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeFileSync(path.join(sessionDir(state), 'SYSTEM.md'), `${systemPrompt}\n`, 'utf8');
}
