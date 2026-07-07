import { writeFileSync } from 'node:fs';
import path from 'node:path';
import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { sessionDir } from './session_session_dir';

export function writeSystemPrompt(state: SessionState, name: string, prompt: string): void {
	ensureSession(state);
	writeFileSync(path.join(sessionDir(state), name), `${prompt}\n`, 'utf8');
}
