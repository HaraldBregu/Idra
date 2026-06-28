export const TasksChannels = {
	list: 'tasks:list',
} as const;

export interface TasksInvokeChannelMap {
	[TasksChannels.list]: { args: []; result: import('../../../main/cron/types').CronSchedule[] };
}
