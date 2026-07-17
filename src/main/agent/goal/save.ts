import { writeFileSync } from 'node:fs';
import type { SessionState } from '../session';
import { ensureSession } from '../session/session_ensure_session';
import { goalPath } from './path';
import type { ThreadGoal } from './types';

export function saveGoal(state: SessionState, goal: ThreadGoal): void {
	ensureSession(state);
	writeFileSync(goalPath(state), `${JSON.stringify(goal, null, '\t')}\n`, 'utf8');
}
