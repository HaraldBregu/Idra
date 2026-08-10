export type AgentRunPriority = 'high' | 'normal' | 'low';

interface SchedulerOptions {
	priority?: AgentRunPriority;
	signal?: AbortSignal;
}

interface QueuedRun<T> {
	key: string;
	priority: AgentRunPriority;
	sequence: number;
	signal?: AbortSignal;
	task: () => Promise<T>;
	resolve: (value: T | PromiseLike<T>) => void;
	reject: (reason?: unknown) => void;
	onAbort?: () => void;
}

const PRIORITY_ORDER: Record<AgentRunPriority, number> = {
	high: 0,
	normal: 1,
	low: 2,
};

export class AgentRunScheduler {
	private readonly queue: QueuedRun<unknown>[] = [];
	private readonly activeKeys = new Set<string>();
	private active = 0;
	private sequence = 0;
	private higherPriorityDequeues = 0;

	constructor(private readonly concurrency: number) {}

	run<T>(key: string, task: () => Promise<T>, options: SchedulerOptions = {}): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			if (options.signal?.aborted) {
				reject(options.signal.reason ?? new DOMException('Run cancelled.', 'AbortError'));
				return;
			}
			const entry: QueuedRun<T> = {
				key,
				priority: options.priority ?? 'normal',
				sequence: this.sequence++,
				signal: options.signal,
				task,
				resolve,
				reject,
			};
			if (options.signal) {
				entry.onAbort = () => {
					const index = this.queue.indexOf(entry as QueuedRun<unknown>);
					if (index === -1) return;
					this.queue.splice(index, 1);
				reject(options.signal?.reason ?? new DOMException('Run cancelled.', 'AbortError'));
					this.pump();
				};
				options.signal.addEventListener('abort', entry.onAbort, { once: true });
			}
			this.queue.push(entry as QueuedRun<unknown>);
			this.pump();
		});
	}

	private pump(): void {
		while (this.active < this.concurrency) {
			const entry = this.next();
			if (!entry) return;
			const index = this.queue.indexOf(entry);
			this.queue.splice(index, 1);
			if (entry.onAbort) entry.signal?.removeEventListener('abort', entry.onAbort);
			this.active += 1;
			this.activeKeys.add(entry.key);
			void Promise.resolve()
				.then(entry.task)
				.then(entry.resolve, entry.reject)
				.finally(() => {
					this.active -= 1;
					this.activeKeys.delete(entry.key);
					this.pump();
				});
		}
	}

	private next(): QueuedRun<unknown> | undefined {
		const eligible = this.queue.filter(
			(entry, index) =>
				!this.activeKeys.has(entry.key) &&
				!this.queue.slice(0, index).some((candidate) => candidate.key === entry.key)
		);
		if (eligible.length === 0) return undefined;

		const highest = Math.min(...eligible.map((entry) => PRIORITY_ORDER[entry.priority]));
		const preferred = eligible
			.filter((entry) => PRIORITY_ORDER[entry.priority] === highest)
			.sort((left, right) => left.sequence - right.sequence);
		const lower = eligible
			.filter((entry) => PRIORITY_ORDER[entry.priority] > highest)
			.sort((left, right) => left.sequence - right.sequence);

		if (lower.length > 0 && this.higherPriorityDequeues >= 3) {
			this.higherPriorityDequeues = 0;
			return lower[0];
		}
		this.higherPriorityDequeues = lower.length > 0 ? this.higherPriorityDequeues + 1 : 0;
		return preferred[0];
	}
}
