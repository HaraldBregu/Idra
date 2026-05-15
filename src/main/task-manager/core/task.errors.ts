import type { JsonObject, TaskError } from './task.types';

export class TaskManagerError extends Error {
	readonly code: string;
	readonly retryable: boolean;
	readonly safeUserMessage: string;
	readonly metadata?: JsonObject;

	constructor(input: {
		code: string;
		message: string;
		retryable?: boolean;
		safeUserMessage?: string;
		metadata?: JsonObject;
	}) {
		super(input.message);
		this.name = this.constructor.name;
		this.code = input.code;
		this.retryable = input.retryable ?? false;
		this.safeUserMessage = input.safeUserMessage ?? input.message;
		this.metadata = input.metadata;
	}

	toTaskError(includeStack = false): TaskError {
		return {
			code: this.code,
			message: this.message,
			retryable: this.retryable,
			safeUserMessage: this.safeUserMessage,
			metadata: this.metadata,
			stack: includeStack ? this.stack : undefined,
		};
	}
}

export class TaskValidationError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject) {
		super({ code: 'VALIDATION_FAILED', message, safeUserMessage: message, metadata });
	}
}

export class TaskPermissionError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject) {
		super({ code: 'PERMISSION_DENIED', message, safeUserMessage: message, metadata });
	}
}

export class TaskTimeoutError extends TaskManagerError {
	constructor(message = 'Task timed out.', metadata?: JsonObject) {
		super({ code: 'TIMEOUT', message, retryable: true, safeUserMessage: 'The task timed out.', metadata });
	}
}

export class TaskCancellationError extends TaskManagerError {
	constructor(message = 'Task was cancelled.', metadata?: JsonObject) {
		super({ code: 'CANCELLED', message, safeUserMessage: 'The task was cancelled.', metadata });
	}
}

export class TaskDependencyError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject) {
		super({ code: 'DEPENDENCY_FAILED', message, safeUserMessage: message, metadata });
	}
}

export class TaskExecutionError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject, retryable = false) {
		super({ code: retryable ? 'TRANSIENT' : 'EXECUTION_FAILED', message, retryable, safeUserMessage: message, metadata });
	}
}

export class TaskRetryExhaustedError extends TaskManagerError {
	constructor(message = 'Task retry attempts were exhausted.', metadata?: JsonObject) {
		super({ code: 'RETRY_EXHAUSTED', message, safeUserMessage: message, metadata });
	}
}

export class TaskStoreError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject) {
		super({ code: 'STORE_ERROR', message, retryable: true, safeUserMessage: 'Task storage failed.', metadata });
	}
}

export class TaskLockError extends TaskManagerError {
	constructor(message: string, metadata?: JsonObject) {
		super({ code: 'LOCK_FAILED', message, retryable: true, safeUserMessage: 'Task lock could not be acquired.', metadata });
	}
}

export class TaskNotFoundError extends TaskManagerError {
	constructor(taskId: string) {
		super({ code: 'TASK_NOT_FOUND', message: `Task not found: ${taskId}`, safeUserMessage: 'Task not found.', metadata: { taskId } });
	}
}

export class TaskDefinitionNotFoundError extends TaskManagerError {
	constructor(taskType: string) {
		super({ code: 'TASK_DEFINITION_NOT_FOUND', message: `Task definition not found: ${taskType}`, safeUserMessage: 'Task type is not registered.', metadata: { taskType } });
	}
}

export class TaskConfirmationRequiredError extends TaskManagerError {
	constructor(taskId: string, confirmationId?: string) {
		super({
			code: 'CONFIRMATION_REQUIRED',
			message: `Task requires confirmation: ${taskId}`,
			safeUserMessage: 'Confirmation is required before this task can run.',
			metadata: confirmationId ? { taskId, confirmationId } : { taskId },
		});
	}
}

export function toTaskError(error: unknown): TaskError {
	if (error instanceof TaskManagerError) return error.toTaskError();
	if (isTaskErrorLike(error)) {
		return {
			code: error.code,
			message: error.message,
			retryable: error.retryable,
			safeUserMessage: error.safeUserMessage,
			metadata: error.metadata,
		};
	}
	if (error instanceof Error) {
		return {
			code: 'EXECUTION_FAILED',
			message: error.message,
			retryable: false,
			safeUserMessage: 'The task failed.',
		};
	}
	return {
		code: 'EXECUTION_FAILED',
		message: String(error),
		retryable: false,
		safeUserMessage: 'The task failed.',
	};
}

function isTaskErrorLike(error: unknown): error is TaskError {
	return (
		typeof error === 'object' &&
		error !== null &&
		typeof (error as TaskError).code === 'string' &&
		typeof (error as TaskError).message === 'string' &&
		typeof (error as TaskError).retryable === 'boolean' &&
		typeof (error as TaskError).safeUserMessage === 'string'
	);
}
