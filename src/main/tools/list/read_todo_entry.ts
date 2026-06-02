import type { PlanEntry } from '../base/tool';
import { requireTask } from './require_task';
import type { TodoInput } from './state_types';

export function readTodoEntry(value: TodoInput): PlanEntry {
	if (typeof value === 'string') return { task: requireTask(value), status: 'pending' };
	return {
		task: requireTask(value.task),
		status: value.status ?? 'pending',
	};
}
