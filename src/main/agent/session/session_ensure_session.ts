import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { SessionState } from './session_types';
import { messagesFilePath } from './session_messages_file_path';
import { runFilePath } from './session_run_file_path';
import { sessionDir } from './session_session_dir';

export function ensureSession(state: SessionState): void {
	mkdirSync(sessionDir(state), { recursive: true });
	if (!existsSync(messagesFilePath(state))) writeFileSync(messagesFilePath(state), '[]\n', 'utf8');
	if (!existsSync(runFilePath(state))) writeFileSync(runFilePath(state), '', 'utf8');
}
