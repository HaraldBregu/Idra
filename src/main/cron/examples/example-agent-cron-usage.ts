import type { AgentCronService } from '../agent/agent-cron-service';
import { AGENT_TASK_TYPE } from '../../tasks';

export async function createMondayInvoiceReminder(agentCron: AgentCronService): Promise<string> {
	const schedule = await agentCron.createScheduleFromAgent(
		{
			name: 'Review invoices reminder',
			type: 'cron',
			cronExpression: '0 9 * * 1',
			taskType: AGENT_TASK_TYPE,
			taskInput: { message: 'Review invoices' },
			missedRunPolicy: 'skip',
			concurrencyPolicy: 'skipIfRunning',
		},
		{
			agentId: 'agent',
			userId: 'current-user',
			timezone: 'Europe/Rome',
			permissions: [
				'createSchedule',
				'listSchedules',
				'pauseSchedule',
				'resumeSchedule',
				'deleteSchedule',
			],
		}
	);
	return schedule.id;
}
