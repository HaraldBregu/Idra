import { Worker } from 'node:worker_threads';
import type { Task, TaskDefinition, TaskExecutionContext, TaskResult, TaskWorker } from '../core/task.types';
import { TaskExecutionError } from '../core/task.errors';

interface WorkerTaskMessage {
	taskId: string;
	type: string;
	input: unknown;
}

interface WorkerTaskResponse {
	status: 'success' | 'failure';
	output?: unknown;
	error?: { code: string; message: string; retryable?: boolean };
}

export class WorkerTaskRunner implements TaskWorker {
	constructor(
		readonly workerId: string,
		private readonly workerScriptPath: string
	) {}

	async run(task: Task, _definition: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
		return new Promise<TaskResult>((resolve, reject) => {
			const worker = new Worker(this.workerScriptPath, {
				workerData: {
					taskId: task.id,
					type: task.type,
					input: task.input,
				} satisfies WorkerTaskMessage,
			});

			const abort = (): void => {
				void worker.terminate();
				reject(new TaskExecutionError(`Worker task aborted: ${task.id}`, { taskId: task.id }));
			};
			context.signal.addEventListener('abort', abort, { once: true });

			worker.once('message', (message: WorkerTaskResponse) => {
				context.signal.removeEventListener('abort', abort);
				void worker.terminate();
				if (message.status === 'success') {
					resolve({ status: 'success', output: message.output });
				} else {
					resolve({
						status: 'failure',
						error: {
							code: message.error?.code ?? 'WORKER_FAILED',
							message: message.error?.message ?? 'Worker failed.',
							retryable: message.error?.retryable ?? false,
							safeUserMessage: 'Background worker failed.',
						},
					});
				}
			});
			worker.once('error', (error) => {
				context.signal.removeEventListener('abort', abort);
				reject(new TaskExecutionError(error.message, { taskId: task.id }));
			});
			worker.once('exit', (code) => {
				context.signal.removeEventListener('abort', abort);
				if (code !== 0) {
					reject(new TaskExecutionError(`Worker exited with code ${code}`, { taskId: task.id, code }));
				}
			});
		});
	}

	async shutdown(): Promise<void> {
		// Workers are one-shot per task; no persistent pool to close.
	}
}
