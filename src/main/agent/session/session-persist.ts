import { writeFileSync } from 'node:fs';
import type { SessionState } from './session-types';
import { ensureSession } from './session-ensure-session';
import { messagesFilePath } from './session-messages-file-path';

export function persist(state: SessionState): void {
	ensureSession(state);
	writeFileSync(
		messagesFilePath(state),
		`${JSON.stringify(state.messages, null, '\t')}\n`,
		'utf8'
	);
}
