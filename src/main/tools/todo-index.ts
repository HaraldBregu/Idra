import type { PlanEntry } from './base/tool';

export function todoIndex(entries: PlanEntry[], index?: number, task?: string): number {
	if (typeof index === 'number' && Number.isFinite(index)) {
		const next = Math.floor(index) - 1;
		return next >= 0 && next < entries.length ? next : -1;
	}
	const target = task?.trim();
	return target ? entries.findIndex((entry) => entry.task === target) : -1;
}
