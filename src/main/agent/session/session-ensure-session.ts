import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { SessionState } from './session-types';
import { messagesFilePath } from './session-messages-file-path';
import { runFilePath } from './session-run-file-path';
import { sessionDir } from './session-session-dir';

export function ensureSession(state: SessionState): void {
	mkdirSync(sessionDir(state), { recursive: true });
	if (!existsSync(messagesFilePath(state))) writeFileSync(messagesFilePath(state), '[]\n', 'utf8');
	if (!existsSync(runFilePath(state))) writeFileSync(runFilePath(state), '', 'utf8');
}
