import type { TaskRecord, TaskStatus } from '../../../../../../shared/tasks';

export function formatTimestamp(value: string | undefined): string {
	if (!value) return '—';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '—';
	return date.toLocaleString();
}

export function formatTaskValue(value: unknown): string {
	if (value === undefined || value === null || value === '') return '—';
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value, null, 2);
}

export function taskMetadataEntries(task: TaskRecord): readonly (readonly [string, string])[] {
	return Object.entries(task.metadata)
		.map(([key, value]) => [key, formatTaskValue(value)] as const)
		.filter(([, value]) => value !== '—');
}

export function taskStatusLabelKey(status: TaskStatus): string {
	return `settings.taskManager.status.${status}`;
}

export function taskStatusVariant(status: TaskStatus): 'outline' | 'secondary' | 'destructive' {
	switch (status) {
		case 'failed':
		case 'cancelled':
			return 'destructive';
		case 'queued':
		case 'cancelling':
			return 'secondary';
		case 'running':
		case 'succeeded':
			return 'outline';
	}
}

export function sortTasks(tasks: readonly TaskRecord[]): TaskRecord[] {
	return [...tasks].sort((left, right) => {
		const leftTime = Date.parse(left.createdAt);
		const rightTime = Date.parse(right.createdAt);
		return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
	});
}
