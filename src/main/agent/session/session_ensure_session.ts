import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { SessionState } from './session_types';
import { infoFile } from './session_info_file';
import { messagesFilePath } from './session_messages_file_path';
import { runFilePath } from './session_run_file_path';
import { sessionDir } from './session_session_dir';

export function ensureSession(state: SessionState): void {
	mkdirSync(sessionDir(state), { recursive: true });
	const infoPath = infoFile(state.sessionsPath, state.id);
	if (!existsSync(infoPath))
		writeFileSync(infoPath, `${JSON.stringify({ type: state.category })}\n`, 'utf8');
	if (!existsSync(messagesFilePath(state))) writeFileSync(messagesFilePath(state), '[]\n', 'utf8');
	if (!existsSync(runFilePath(state))) writeFileSync(runFilePath(state), '', 'utf8');
}
