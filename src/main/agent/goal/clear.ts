import { existsSync, unlinkSync } from 'node:fs';
import type { SessionState } from '../session';
import { goalPath } from './path';

export function clearGoal(state: SessionState): boolean {
	if (!state.sessionsPath) return false;
	const file = goalPath(state);
	if (!existsSync(file)) return false;
	unlinkSync(file);
	return true;
}
