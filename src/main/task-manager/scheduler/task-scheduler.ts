import type { TaskCreateRequest, TaskSchedulePolicy } from '../core/task.types';

export interface ScheduledTaskManager {
	scheduleTask(request: TaskCreateRequest): Promise<unknown>;
	enqueueTask(taskId: string): Promise<void>;
}

export class TaskScheduler {
	private readonly timers = new Map<string, NodeJS.Timeout>();

	constructor(private readonly manager: ScheduledTaskManager) {}

	async schedule(request: TaskCreateRequest): Promise<unknown> {
		return this.manager.scheduleTask(request);
	}

	planNextRun(policy: TaskSchedulePolicy, from = new Date()): string | undefined {
		if (policy.runAt) return policy.runAt;
		if (policy.intervalMs !== undefined) return new Date(from.getTime() + policy.intervalMs).toISOString();
		if (policy.cronExpression === '@daily' || policy.cronExpression === '0 0 * * *') {
			const next = new Date(from);
			next.setUTCDate(next.getUTCDate() + 1);
			next.setUTCHours(0, 0, 0, 0);
			return next.toISOString();
		}
		return undefined;
	}

	wakeTask(taskId: string, runAt: string): void {
		this.cancelWake(taskId);
		const delay = Math.max(0, Date.parse(runAt) - Date.now());
		const timer = setTimeout(() => {
			this.timers.delete(taskId);
			void this.manager.enqueueTask(taskId);
		}, delay);
		timer.unref?.();
		this.timers.set(taskId, timer);
	}

	cancelWake(taskId: string): void {
		const timer = this.timers.get(taskId);
		if (!timer) return;
		clearTimeout(timer);
		this.timers.delete(taskId);
	}

	shutdown(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);
		this.timers.clear();
	}
}
