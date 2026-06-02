import type { PlanEntry } from '../base/tool';
import { requireTask } from './require-task';
import type { TodoInput } from './types';

export function readTodoEntry(value: TodoInput): PlanEntry {
	if (typeof value === 'string') return { task: requireTask(value), status: 'pending' };
	return {
		task: requireTask(value.task),
		status: value.status ?? 'pending',
	};
}
