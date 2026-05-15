import type { Task } from '../core/task.types';

export interface ConcurrencyLimits {
	global: number;
	perTaskType?: Record<string, number>;
	perSource?: Record<string, number>;
	perUser?: number;
}

export class ConcurrencyLimiter {
	private running = 0;
	private readonly byType = new Map<string, number>();
	private readonly bySource = new Map<string, number>();
	private readonly byUser = new Map<string, number>();

	constructor(private limits: ConcurrencyLimits) {}

	setGlobalLimit(limit: number): void {
		this.limits = { ...this.limits, global: limit };
	}

	canRun(task: Task): boolean {
		if (this.running >= this.limits.global) return false;
		const typeLimit = this.limits.perTaskType?.[task.type];
		if (typeLimit !== undefined && (this.byType.get(task.type) ?? 0) >= typeLimit) return false;
		const sourceLimit = this.limits.perSource?.[task.source];
		if (sourceLimit !== undefined && (this.bySource.get(task.source) ?? 0) >= sourceLimit) return false;
		if (task.userId && this.limits.perUser !== undefined && (this.byUser.get(task.userId) ?? 0) >= this.limits.perUser) {
			return false;
		}
		return true;
	}

	markStarted(task: Task): void {
		this.running++;
		this.increment(this.byType, task.type);
		this.increment(this.bySource, task.source);
		if (task.userId) this.increment(this.byUser, task.userId);
	}

	markFinished(task: Task): void {
		this.running = Math.max(0, this.running - 1);
		this.decrement(this.byType, task.type);
		this.decrement(this.bySource, task.source);
		if (task.userId) this.decrement(this.byUser, task.userId);
	}

	runningCount(): number {
		return this.running;
	}

	private increment(map: Map<string, number>, key: string): void {
		map.set(key, (map.get(key) ?? 0) + 1);
	}

	private decrement(map: Map<string, number>, key: string): void {
		const next = Math.max(0, (map.get(key) ?? 0) - 1);
		if (next === 0) map.delete(key);
		else map.set(key, next);
	}
}
