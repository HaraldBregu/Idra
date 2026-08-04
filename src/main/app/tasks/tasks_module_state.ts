import type { TaskEventListener, TaskJobHandle } from './tasks_internal_types';
import type { TaskRunner } from './tasks_types';

export const tasks = new Map<string, TaskJobHandle>();
export const listeners = new Set<TaskEventListener>();
export let enabled = true;
export let runner: TaskRunner | undefined;

export function setCronEnabled(value: boolean): void {
	enabled = value;
}

export function setCronRunner(value: TaskRunner | undefined): void {
	runner = value;
}
