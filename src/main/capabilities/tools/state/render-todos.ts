import type { PlanEntry } from '../base/tool';

export function renderTodos(entries: PlanEntry[]): string {
	if (entries.length === 0) return 'No todos.';
	return entries
		.map((entry, index) => `${index + 1}. [${entry.status}] ${entry.task}`)
		.join('\n');
}
