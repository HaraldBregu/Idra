import { existsSync, unlinkSync } from 'node:fs';
import type { SessionState } from '../session';
import { goalPath } from './path';

export function clearGoal(state: SessionState): boolean {
	const file = goalPath(state);
	if (!state.sessionsPath || !existsSync(file)) return false;
	unlinkSync(file);
	return true;
}
