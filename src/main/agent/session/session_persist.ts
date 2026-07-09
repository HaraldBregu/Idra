import { writeFileSync } from 'node:fs';
import type { SessionState } from './session_types';
import { ensureSession } from './session_ensure_session';
import { messagesFilePath } from './session_messages_file_path';

export function persist(state: SessionState): void {
	if (!state.sessionsPath) return;
	ensureSession(state);
	writeFileSync(
		messagesFilePath(state),
		`${JSON.stringify(state.messages, null, '\t')}\n`,
		'utf8'
	);
}
