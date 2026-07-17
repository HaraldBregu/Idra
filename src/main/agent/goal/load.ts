import { existsSync, readFileSync } from 'node:fs';
import type { SessionState } from '../session';
import { goalPath } from './path';
import type { ThreadGoal } from './types';

export function loadGoal(state: SessionState): ThreadGoal | undefined {
	const file = goalPath(state);
	if (!state.sessionsPath || !existsSync(file)) return undefined;
	try {
		const value = JSON.parse(readFileSync(file, 'utf8')) as Partial<ThreadGoal>;
		if (
			value.threadId !== state.id ||
			typeof value.objective !== 'string' ||
			!['active', 'paused', 'complete', 'budget_limited'].includes(value.status ?? '') ||
			!value.budget ||
			!value.usage
		) {
			return undefined;
		}
		return value as ThreadGoal;
	} catch {
		return undefined;
	}
}
