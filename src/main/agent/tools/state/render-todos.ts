import type { PlanEntry } from '../core/types';

export function renderTodos(entries: PlanEntry[]): string {
	if (entries.length === 0) return 'No todos.';
	return entries
		.map((entry, index) => `${index + 1}. [${entry.status}] ${entry.task}`)
		.join('\n');
}
