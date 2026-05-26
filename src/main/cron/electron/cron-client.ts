import type {
	CronExecutionRecord,
	CronNextRunPreview,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleUpdateRequest,
	FridayCronToolRequest as FridayCronActionRequest,
	FridayCronToolResponse as FridayCronActionResponse,
	CronScheduledTask,
} from '../../../shared/cron';

export interface CronClient {
	createSchedule(request: CronScheduleCreateRequest): Promise<CronSchedule>;
	updateSchedule(scheduleId: string, patch: CronScheduleUpdateRequest): Promise<CronSchedule>;
	pauseSchedule(scheduleId: string): Promise<void>;
	resumeSchedule(scheduleId: string): Promise<void>;
	deleteSchedule(scheduleId: string): Promise<void>;
	listSchedules(filter?: CronScheduleFilter): Promise<CronSchedule[]>;
	getSchedule(scheduleId: string): Promise<CronSchedule>;
	getScheduleEvents(scheduleId: string): Promise<CronScheduleEvent[]>;
	getScheduleExecutions(scheduleId: string): Promise<CronExecutionRecord[]>;
	runScheduleNow(scheduleId: string): Promise<CronScheduledTask>;
	getNextRuns(scheduleId: string, count: number): Promise<CronNextRunPreview>;
	action(request: FridayCronActionRequest): Promise<FridayCronActionResponse>;
	subscribeToSchedules(listener: (event: CronScheduleEvent) => void): () => void;
	subscribeToSchedule(scheduleId: string, listener: (event: CronScheduleEvent) => void): () => void;
}
