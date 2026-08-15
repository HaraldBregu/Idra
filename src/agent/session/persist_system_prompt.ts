import { writeFileSync } from 'node:fs';
import type { SessionState } from './types';
import { ensureSession } from './ensure_session';
import { sessionPath } from './session_path';

export function persistSystemPrompt(state: SessionState, systemPrompt: string): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeFileSync(
		sessionPath(state.sessionsPath, state.folderName, 'SYSTEM.md'),
		`${systemPrompt}\n`,
		'utf8'
	);
}
