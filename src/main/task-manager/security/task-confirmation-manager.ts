import { randomUUID } from 'node:crypto';
import type { TaskConfirmation, TaskId } from '../core/task.types';
import { TaskConfirmationRequiredError, TaskNotFoundError, TaskValidationError } from '../core/task.errors';

export class TaskConfirmationManager {
	private readonly confirmations = new Map<string, TaskConfirmation & { status: 'pending' | 'confirmed' | 'rejected' }>();

	requestConfirmation(input: Omit<TaskConfirmation, 'confirmationId' | 'createdAt'>): TaskConfirmation {
		const confirmation: TaskConfirmation & { status: 'pending' } = {
			...input,
			confirmationId: randomUUID(),
			createdAt: new Date().toISOString(),
			status: 'pending',
		};
		this.confirmations.set(confirmation.confirmationId, confirmation);
		return confirmation;
	}

	confirmTask(confirmationId: string): TaskId {
		const confirmation = this.confirmations.get(confirmationId);
		if (!confirmation) throw new TaskNotFoundError(confirmationId);
		if (Date.parse(confirmation.expiresAt) <= Date.now()) {
			throw new TaskValidationError('Confirmation expired.', { confirmationId });
		}
		confirmation.status = 'confirmed';
		return confirmation.taskId;
	}

	rejectTask(confirmationId: string): TaskId {
		const confirmation = this.confirmations.get(confirmationId);
		if (!confirmation) throw new TaskNotFoundError(confirmationId);
		confirmation.status = 'rejected';
		return confirmation.taskId;
	}

	assertConfirmed(taskId: TaskId): void {
		const confirmed = [...this.confirmations.values()].some(
			(confirmation) => confirmation.taskId === taskId && confirmation.status === 'confirmed'
		);
		if (!confirmed) throw new TaskConfirmationRequiredError(taskId);
	}
}
