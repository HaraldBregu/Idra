import type { CronTaskHandler } from '../core';
import { runAgentTask } from './agent';
import { runDebugTask } from './debug';

const CRON_TASK_HANDLERS: Record<string, CronTaskHandler> = {
	agent: runAgentTask,
	debug: runDebugTask,
};

export function resolveTaskHandler(taskType: string): CronTaskHandler {
	return CRON_TASK_HANDLERS[taskType] ?? runAgentTask;
}
