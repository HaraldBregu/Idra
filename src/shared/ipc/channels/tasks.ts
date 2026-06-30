export const TasksChannels = {
	list: 'tasks:list',
	getRuntime: 'tasks:runtime:get',
	setRuntime: 'tasks:runtime:set',
} as const;

export interface TasksInvokeChannelMap {
	[TasksChannels.list]: { args: []; result: import('../../../main/agent/cron/cron').CronSchedule[] };
	[TasksChannels.getRuntime]: {
		args: [];
		result: import('../../../main/agent/cron/cron').CronRuntime | undefined;
	};
	[TasksChannels.setRuntime]: {
		args: [providerId: string, modelId: string];
		result: import('../../../main/agent/cron/cron').CronRuntime;
	};
}
