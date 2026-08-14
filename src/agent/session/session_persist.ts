import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { messagesBackupFilePath } from './session_messages_backup_file_path';
import { messagesFilePath } from './session_messages_file_path';
import { writeMessagesFile } from './session_write_messages';

export function persist(state: SessionState): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeMessagesFile(
		messagesFilePath(state),
		messagesBackupFilePath(state),
		`${JSON.stringify(state.messages, null, '\t')}\n`
	);
}
