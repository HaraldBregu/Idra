import { mkdirSync, writeFileSync } from 'node:fs';
import type { SessionGoal } from './run_goal_types';
import { goalFilePath } from './run_goal_file_path';

export function writeGoal(sessionDir: string, goal: SessionGoal): SessionGoal {
	mkdirSync(sessionDir, { recursive: true });
	writeFileSync(goalFilePath(sessionDir), `${JSON.stringify(goal, null, '\t')}\n`, 'utf8');
	return goal;
}
