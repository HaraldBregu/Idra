import type {
	CronExecutionRecord,
	CronNextRunPreview,
	CronSchedule,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleFilter,
	CronScheduleUpdateRequest,
	OpenClawCronToolRequest,
	OpenClawCronToolResponse,
} from '../../../shared/cron';
import type { Task } from '../../../shared/task';

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
	runScheduleNow(scheduleId: string): Promise<Task>;
	getNextRuns(scheduleId: string, count: number): Promise<CronNextRunPreview>;
	action(request: OpenClawCronToolRequest): Promise<OpenClawCronToolResponse>;
	subscribeToSchedules(listener: (event: CronScheduleEvent) => void): () => void;
	subscribeToSchedule(scheduleId: string, listener: (event: CronScheduleEvent) => void): () => void;
}
