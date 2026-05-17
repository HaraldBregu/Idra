import type { TaskStatus } from './task.types';
import { TaskValidationError } from './task.errors';

const TERMINAL_STATUSES = new Set<TaskStatus>(['completed', 'failed', 'cancelled', 'timedOut', 'skipped']);

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	pending: ['queued', 'scheduled', 'waitingForDependency', 'cancelled', 'skipped'],
	queued: ['running', 'paused', 'scheduled', 'waitingForDependency', 'cancelled', 'skipped'],
	scheduled: ['queued', 'cancelled', 'skipped'],
	running: ['completed', 'failed', 'cancelled', 'timedOut', 'paused', 'retrying'],
	waitingForDependency: ['queued', 'failed', 'skipped', 'cancelled'],
	paused: ['queued', 'cancelled'],
	retrying: ['queued', 'failed', 'cancelled'],
	completed: [],
	failed: ['retrying', 'queued'],
	cancelled: [],
	timedOut: ['retrying', 'queued', 'failed'],
	skipped: [],
};

export function isTerminalStatus(status: TaskStatus): boolean {
	return TERMINAL_STATUSES.has(status);
}

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
	return from === to || VALID_TRANSITIONS[from]?.includes(to) === true;
}

export function assertValidTransition(from: TaskStatus, to: TaskStatus): void {
	if (!canTransition(from, to)) {
		throw new TaskValidationError(`Invalid task transition: ${from} -> ${to}`, { from, to });
	}
}
