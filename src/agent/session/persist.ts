import type { SessionState } from './types';
import { ensureSession } from './ensure_session';
import { messagesBackupFilePath } from './messages_backup_file_path';
import { messagesFilePath } from './messages_file_path';
import { writeMessagesFile } from './write_messages_file';

export function persist(state: SessionState): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeMessagesFile(
		messagesFilePath(state),
		messagesBackupFilePath(state),
		`${JSON.stringify(state.messages, null, '\t')}\n`
	);
}
