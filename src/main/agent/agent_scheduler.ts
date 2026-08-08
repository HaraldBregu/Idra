export class AgentRunScheduler {
	private readonly tails = new Map<string, Promise<void>>();
	private readonly waiters: Array<() => void> = [];
	private active = 0;

	constructor(private readonly concurrency: number) {}

	run<T>(key: string, task: () => Promise<T>): Promise<T> {
		const previous = this.tails.get(key) ?? Promise.resolve();
		const run = previous
			.catch(() => undefined)
			.then(() => this.acquire())
			.then(async (release) => {
				try {
					return await task();
				} finally {
					release();
				}
			});
		const tail = run.then(() => undefined, () => undefined);
		this.tails.set(key, tail);
		const cleanup = () => {
			if (this.tails.get(key) === tail) this.tails.delete(key);
		};
		void tail.then(cleanup, cleanup);
		return run;
	}

	private acquire(): Promise<() => void> {
		if (this.active < this.concurrency) {
			this.active += 1;
			return Promise.resolve(() => this.release());
		}
		return new Promise((resolve) => {
			this.waiters.push(() => {
				this.active += 1;
				resolve(() => this.release());
			});
		});
	}

	private release(): void {
		this.active -= 1;
		this.waiters.shift()?.();
	}
}
