import type { LoggerService } from '../logger';
import type { CronTaskHandler } from './types';

export interface AgentSender {
	send(message: string): Promise<string>;
}

/**
 * Build the tick handler that runs whenever a scheduled cron job fires.
 * Forwards the task's message to the assistant and swallows errors so a
 * single failure doesn't stop the cron timer.
 */
export function createCronTickDispatcher(
	agent: AgentSender,
	logger: LoggerService
): CronTaskHandler {
	return async (task) => {
		try {
			logger.info('CronService', `Tick: ${task.id} -> agent ('${task.message}')`);
			await agent.send(task.message);
		} catch (err) {
			logger.error('CronService', `Tick dispatch failed for "${task.id}"`, err);
		}
	};
}
