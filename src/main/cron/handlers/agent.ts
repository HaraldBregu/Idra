import type { CronTaskContext } from '../core';
import { resolvePrompt } from './prompt';

export function runAgentTask({ schedule, task, logger, agent }: CronTaskContext): void {
	const agentId = `cron:${schedule.id}`;
	if (schedule.concurrencyPolicy === 'skipIfRunning' && agent.isBusy(agentId)) {
		logger.warn(
			'CronService',
			`Schedule ${schedule.id} skipped: previous agent run still in progress.`
		);
		return;
	}
	agent
		.send(resolvePrompt(schedule), agentId, { sessionId: task.id, category: 'task' })
		.catch((error) => {
			logger.error('CronService', `Agent run failed for schedule ${schedule.id}.`, error);
		});
}
