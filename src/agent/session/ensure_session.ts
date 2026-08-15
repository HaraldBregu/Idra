import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { SessionState } from './types';
import { infoFile } from './info_file';
import { messagesBackupFilePath } from './messages_backup_file_path';
import { messagesFilePath } from './messages_file_path';
import { runFilePath } from './run_file_path';
import { sessionDir } from './session_dir';
import { writeMessagesFile } from './write_messages_file';

export function ensureSession(state: SessionState): void {
	mkdirSync(sessionDir(state), { recursive: true });
	const infoPath = infoFile(state.sessionsPath, state.id);
	if (!existsSync(infoPath))
		writeFileSync(infoPath, `${JSON.stringify({ type: state.category })}\n`, 'utf8');
	if (!existsSync(messagesFilePath(state)))
		writeMessagesFile(messagesFilePath(state), messagesBackupFilePath(state), '[]\n');
	if (!existsSync(runFilePath(state))) writeFileSync(runFilePath(state), '', 'utf8');
}
