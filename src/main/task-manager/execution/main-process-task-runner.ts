import type { Task, TaskDefinition, TaskExecutionContext, TaskResult, TaskWorker } from '../core/task.types';

export class MainProcessTaskRunner implements TaskWorker {
	readonly workerId: string;

	constructor(workerId = `main-${process.pid}`) {
		this.workerId = workerId;
	}

	async run(task: Task, definition: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
		return definition.executor.execute(task.input, context);
	}

	async shutdown(): Promise<void> {
		// Main-process executors are cooperative and do not own separate resources.
	}
}
