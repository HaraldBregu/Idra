export const TASK_CANCELLED_ERROR_NAME = 'AbortError';

export function taskCancelledError(message = 'Task was cancelled.'): Error {
	const error = new Error(message);
	error.name = TASK_CANCELLED_ERROR_NAME;
	return error;
}

export function isTaskCancelledError(error: unknown): boolean {
	return error instanceof Error && error.name === TASK_CANCELLED_ERROR_NAME;
}
