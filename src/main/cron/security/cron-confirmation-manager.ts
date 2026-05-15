import { randomUUID } from 'node:crypto';
import type {
	CronScheduleConfirmation,
	CronScheduleCreateRequest,
} from '../core/cron.types';
import { ScheduleDescriber } from '../core/cron.describer';

export class CronConfirmationManager {
	private readonly confirmations = new Map<string, CronScheduleConfirmation>();
	private readonly describer = new ScheduleDescriber();

	requestScheduleConfirmation(request: CronScheduleCreateRequest): CronScheduleConfirmation {
		const now = new Date();
		const confirmation: CronScheduleConfirmation = {
			confirmationId: randomUUID(),
			proposedScheduleRequest: request,
			userId: request.ownerUserId,
			actionSummary: `Create schedule "${request.name}" for task ${request.taskType}.`,
			scheduleSummary: this.describeRequest(request),
			dataAccessSummary:
				request.requiredPermissions?.length ? request.requiredPermissions.join(', ') : 'No elevated data access requested.',
			externalEffectSummary: request.requiresConfirmation
				? 'This schedule may perform externally visible or sensitive actions.'
				: 'No externally visible effect declared.',
			risks: request.requiresConfirmation ? ['Recurring background action', 'Potential private data access'] : ['Recurring background action'],
			expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
			createdAt: now.toISOString(),
		};
		this.confirmations.set(confirmation.confirmationId, confirmation);
		return confirmation;
	}

	async confirmSchedule(confirmationId: string): Promise<CronScheduleCreateRequest> {
		const confirmation = this.confirmations.get(confirmationId);
		if (!confirmation) throw new Error('Schedule confirmation not found.');
		if (Date.parse(confirmation.expiresAt) <= Date.now()) {
			this.confirmations.delete(confirmationId);
			throw new Error('Schedule confirmation expired.');
		}
		this.confirmations.delete(confirmationId);
		return {
			...confirmation.proposedScheduleRequest,
			confirmed: true,
			confirmationPolicy: {
				actionSummary: confirmation.actionSummary,
				scheduleSummary: confirmation.scheduleSummary,
				dataAccessSummary: confirmation.dataAccessSummary,
				externalEffectSummary: confirmation.externalEffectSummary,
				risks: confirmation.risks,
				confirmationId,
				confirmedAt: new Date().toISOString(),
				confirmedBy: confirmation.userId,
			},
		};
	}

	rejectSchedule(confirmationId: string): void {
		this.confirmations.delete(confirmationId);
	}

	listPendingConfirmations(): CronScheduleConfirmation[] {
		return [...this.confirmations.values()];
	}

	private describeRequest(request: CronScheduleCreateRequest): string {
		const fakeSchedule = {
			...request,
			id: 'preview',
			status: 'active' as const,
			runCount: 0,
			missedRunPolicy: request.missedRunPolicy ?? 'skip',
			concurrencyPolicy: request.concurrencyPolicy ?? 'skipIfRunning',
			retryPolicy: {
				maxAttempts: 1,
				initialDelayMs: 250,
				maxDelayMs: 5_000,
				backoffMultiplier: 2,
				jitter: true,
				retryableErrorCodes: [],
				nonRetryableErrorCodes: [],
				...(request.retryPolicy ?? {}),
			},
			taskPriority: request.taskPriority ?? 'normal',
			taskTags: request.taskTags ?? [],
			taskMetadata: request.taskMetadata ?? {},
			requiredPermissions: request.requiredPermissions ?? [],
			requiresConfirmation: request.requiresConfirmation ?? false,
			enabled: request.enabled ?? true,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			metadata: request.metadata ?? {},
			audit: [],
			visibility: request.visibility ?? 'user',
		};
		return this.describer.describeSchedule(fakeSchedule);
	}
}
