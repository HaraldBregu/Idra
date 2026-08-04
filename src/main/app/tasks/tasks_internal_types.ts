import type { TaskScheduleEvent } from './tasks_types';

export type TaskEventListener = (event: TaskScheduleEvent) => void;

export interface TaskJobHandle {
	stop(): void;
	getNextRun(): Date | null;
}
