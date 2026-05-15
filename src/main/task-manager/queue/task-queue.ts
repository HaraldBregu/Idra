import type { Task, TaskQueue, TaskQueueStats, TaskStore } from '../core/task.types';
import { PriorityQueue } from './priority-queue';
import { ConcurrencyLimiter, type ConcurrencyLimits } from './concurrency-limiter';

export interface TaskQueueOptions {
	store: TaskStore;
	concurrency: ConcurrencyLimits;
	runTask: (task: Task) => Promise<void>;
}

export class DefaultTaskQueue implements TaskQueue {
	private readonly priorityQueue = new PriorityQueue();
	private readonly queuedTasks = new Map<string, Task>();
	private readonly limiter: ConcurrencyLimiter;
	private running = false;
	private paused = false;
	private deadLettered = 0;
	private drainResolvers: Array<() => void> = [];
	private pumpScheduled = false;

	constructor(private readonly options: TaskQueueOptions) {
		this.limiter = new ConcurrencyLimiter(options.concurrency);
	}

	async enqueue(task: Task): Promise<void> {
		this.priorityQueue.enqueue(task);
		this.queuedTasks.set(task.id, task);
		this.schedulePump();
	}

	async dequeue(): Promise<Task | undefined> {
		const taskId = this.priorityQueue.dequeue(() => true);
		if (taskId) this.queuedTasks.delete(taskId);
		return taskId ? this.options.store.getTask(taskId) : undefined;
	}

	start(): void {
		this.running = true;
		this.paused = false;
		this.schedulePump();
	}

	async stop(): Promise<void> {
		this.running = false;
		await this.drain();
	}

	async drain(): Promise<void> {
		if (this.priorityQueue.size() === 0 && this.limiter.runningCount() === 0) return;
		await new Promise<void>((resolve) => this.drainResolvers.push(resolve));
	}

	size(): number {
		return this.priorityQueue.size();
	}

	pause(): void {
		this.paused = true;
	}

	resume(): void {
		this.paused = false;
		this.schedulePump();
	}

	setConcurrency(limit: number): void {
		this.limiter.setGlobalLimit(limit);
		this.schedulePump();
	}

	getStats(): TaskQueueStats {
		return {
			queued: this.priorityQueue.size(),
			running: this.limiter.runningCount(),
			scheduled: 0,
			paused: this.paused,
			concurrency: this.limiter.runningCount(),
			deadLettered: this.deadLettered,
		};
	}

	remove(taskId: string): void {
		this.priorityQueue.remove(taskId);
		this.queuedTasks.delete(taskId);
		this.resolveDrainIfIdle();
	}

	recordDeadLetter(): void {
		this.deadLettered++;
	}

	private schedulePump(): void {
		if (this.pumpScheduled) return;
		this.pumpScheduled = true;
		queueMicrotask(() => {
			this.pumpScheduled = false;
			void this.pump();
		});
	}

	private async pump(): Promise<void> {
		if (!this.running || this.paused) return;

		while (this.running && !this.paused) {
			const taskId = this.priorityQueue.dequeue((candidateId) => this.canRun(candidateId));
			if (!taskId) break;
			this.queuedTasks.delete(taskId);
			const task = await this.options.store.getTask(taskId);
			this.limiter.markStarted(task);
			void this.options
				.runTask(task)
				.catch(() => {
					this.recordDeadLetter();
				})
				.finally(() => {
					this.limiter.markFinished(task);
					this.resolveDrainIfIdle();
					this.schedulePump();
				});
		}

		this.resolveDrainIfIdle();
	}

	private canRun(taskId: string): boolean {
		const task = this.queuedTasks.get(taskId);
		return task ? this.limiter.canRun(task) : false;
	}

	private resolveDrainIfIdle(): void {
		if (this.priorityQueue.size() > 0 || this.limiter.runningCount() > 0) return;
		const resolvers = this.drainResolvers;
		this.drainResolvers = [];
		resolvers.forEach((resolve) => resolve());
	}
}
