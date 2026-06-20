import type { CronTaskHandler } from '../core';
import { runAgentTask } from './agent';
import { runDebugTask } from './debug';

export function resolveTaskHandler(taskType: string): CronTaskHandler {
	return taskType === 'debug' ? runDebugTask : runAgentTask;
}
