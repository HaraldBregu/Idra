import { rmSync } from 'node:fs';
import { goalFilePath } from './run_goal_file_path';

export function clearGoal(sessionDir: string): void {
	rmSync(goalFilePath(sessionDir), { force: true });
}
