export declare const CronChannels: {
    readonly pauseSchedule: "cron:pauseSchedule";
    readonly resumeSchedule: "cron:resumeSchedule";
    readonly deleteSchedule: "cron:deleteSchedule";
    readonly deleteJob: "cron:deleteJob";
    readonly listSchedules: "cron:listSchedules";
    readonly listJobs: "cron:listJobs";
    readonly getSchedule: "cron:getSchedule";
    readonly runNow: "cron:runNow";
    readonly event: "cron:event";
};
export interface CronInvokeChannelMap {
    [CronChannels.pauseSchedule]: {
        args: [scheduleId: string];
        result: void;
    };
    [CronChannels.resumeSchedule]: {
        args: [scheduleId: string];
        result: void;
    };
    [CronChannels.deleteSchedule]: {
        args: [scheduleId: string];
        result: void;
    };
    [CronChannels.deleteJob]: {
        args: [jobId: string];
        result: void;
    };
    [CronChannels.listSchedules]: {
        args: [filter?: import('../../app/cron').CronScheduleFilter];
        result: import('../../app/cron').CronSchedule[];
    };
    [CronChannels.listJobs]: {
        args: [];
        result: import('../../app/cron').CronJobInfo[];
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
    [CronChannels.event]: {
        data: import('../../app/cron').CronScheduleEvent;
    };
}
