import type { TaskWorker } from '../core/task.types';

export class TaskRunnerRegistry {
	private readonly runners = new Map<string, TaskWorker>();
	private defaultRunnerId?: string;

	registerRunner(kind: string, runner: TaskWorker, options: { default?: boolean } = {}): void {
		this.runners.set(kind, runner);
		if (options.default || !this.defaultRunnerId) this.defaultRunnerId = kind;
	}

	getRunner(kind?: string): TaskWorker {
		const runner = this.runners.get(kind ?? this.defaultRunnerId ?? '');
		if (!runner) throw new Error(`Task runner not found: ${kind ?? this.defaultRunnerId ?? 'default'}`);
		return runner;
	}

	async shutdown(): Promise<void> {
		await Promise.all([...this.runners.values()].map((runner) => runner.shutdown()));
	}
}
