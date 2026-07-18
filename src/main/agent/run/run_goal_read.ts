import { readFileSync } from 'node:fs';
import type { SessionGoal } from './run_goal_types';
import { goalFilePath } from './run_goal_file_path';

export function readGoal(sessionDir: string): SessionGoal | undefined {
	try {
		const goal = JSON.parse(readFileSync(goalFilePath(sessionDir), 'utf8')) as SessionGoal;
		return typeof goal?.objective === 'string' ? goal : undefined;
	} catch {
		return undefined;
	}
}
