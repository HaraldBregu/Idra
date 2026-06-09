export const CronChannels = {
	pauseSchedule: 'cron:pauseSchedule',
	resumeSchedule: 'cron:resumeSchedule',
	deleteSchedule: 'cron:deleteSchedule',
	listSchedules: 'cron:listSchedules',
	getSchedule: 'cron:getSchedule',
	runNow: 'cron:runNow',
	event: 'cron:event',
} as const;

export interface CronInvokeChannelMap {
	[CronChannels.pauseSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.resumeSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.deleteSchedule]: { args: [scheduleId: string]; result: void };
	[CronChannels.listSchedules]: {
		args: [filter?: import('../../app/cron').CronScheduleFilter];
		result: import('../../app/cron').CronSchedule[];
	};
	[CronChannels.getSchedule]: {
		args: [scheduleId: string];
		result: import('../../app/cron').CronSchedule;
	};
	[CronChannels.runNow]: {
		args: [scheduleId: string];
		result: import('../../app/cron').CronScheduledTask;
	};
}

export interface CronEventChannelMap {
	[CronChannels.event]: { data: import('../../app/cron').CronScheduleEvent };
}
