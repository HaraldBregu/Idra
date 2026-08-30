import { chmodSync, writeFileSync } from 'node:fs';
import type { SessionState } from './types';
import { ensureSession } from './ensure_session';
import { sessionPath } from './common';

export function persistSystemPrompt(state: SessionState, systemPrompt: string): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	const filePath = sessionPath(state.sessionsPath, state.folderName, 'SYSTEM.md');
	writeFileSync(filePath, `${systemPrompt}\n`, { encoding: 'utf8', mode: 0o600 });
	chmodSync(filePath, 0o600);
}
