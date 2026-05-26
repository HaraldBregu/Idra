export type TaskStatus =
	| 'queued'
	| 'running'
	| 'cancelling'
	| 'cancelled'
	| 'succeeded'
	| 'failed';

export interface TaskRecord<TResult = unknown> {
	id: string;
	type: string;
	title: string;
	status: TaskStatus;
	providerId?: string;
	modelId?: string;
	createdAt: string;
	startedAt?: string;
	finishedAt?: string;
	progress?: {
		current?: number;
		total?: number;
		message?: string;
	};
	metadata: Record<string, unknown>;
	result?: TResult;
	error?: {
		code: string;
		message: string;
	};
}

export type TaskProgress = TaskRecord['progress'];

export type TaskEvent =
	| { type: 'task:created'; task: TaskRecord }
	| { type: 'task:started'; task: TaskRecord }
	| { type: 'task:updated'; task: TaskRecord }
	| { type: 'task:succeeded'; task: TaskRecord }
	| { type: 'task:failed'; task: TaskRecord }
	| { type: 'task:cancelled'; task: TaskRecord };

export const TASK_EVENT_TYPES = [
	'task:created',
	'task:started',
	'task:updated',
	'task:succeeded',
	'task:failed',
	'task:cancelled',
] as const satisfies readonly TaskEvent['type'][];

export interface TaskContext<TInput> {
	taskId: string;
	input: TInput;
	providerId?: string;
	modelId?: string;
	signal: AbortSignal;
	updateProgress(progress: TaskProgress): void;
}

export interface TaskHandler<TInput = unknown, TResult = unknown> {
	type: string;
	validateInput?: (input: unknown) => TInput;
	run(context: TaskContext<TInput>): Promise<TResult>;
}

export interface TaskRunRequest<TInput = unknown> {
	id?: string;
	type: string;
	title: string;
	providerId?: string;
	modelId?: string;
	input: TInput;
	metadata?: Record<string, unknown>;
}

export interface TaskStoreState {
	schemaVersion: number;
	records: TaskRecord[];
	updatedAt: string;
}
