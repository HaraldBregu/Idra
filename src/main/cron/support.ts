import { randomUUID } from 'node:crypto';
import type {
	CronAuditLog,
	CronJsonObject,
	CronJsonValue,
	CronScheduleAuditEntry,
	CronScheduleConfirmation,
	CronScheduleCreateRequest,
	CronScheduleEvent,
	CronScheduleEventType,
	CronScheduleId,
	CronScheduleStore,
} from './core/types';
import { ScheduleDescriber } from './core/describer';
import { CRON_REDACT_SENSITIVE_KEY_PATTERN } from './constants';

export function redactCronValue(value: CronJsonValue, depth = 0): CronJsonValue {
	if (depth > 6) return '[redacted-depth-limit]';
	if (Array.isArray(value)) return value.map((entry) => redactCronValue(entry, depth + 1));
	if (value && typeof value === 'object') {
		const redacted: CronJsonObject = {};
		for (const [key, child] of Object.entries(value)) {
			redacted[key] = CRON_REDACT_SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redactCronValue(child, depth + 1);
		}
		return redacted;
	}
	if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}...[truncated]`;
	return value;
}

export function summarizeCronValue(value: CronJsonValue): CronJsonObject {
	if (Array.isArray(value)) return { kind: 'array', length: value.length };
	if (value && typeof value === 'object') {
		return {
			kind: 'object',
			keys: Object.keys(value).slice(0, 25),
		};
	}
	return { kind: typeof value, value: redactCronValue(value) };
}

export type CronEventListener = (event: CronScheduleEvent) => void;

export class CronScheduleEventBus {
	private readonly listeners = new Set<CronEventListener>();
	private readonly listenersByType = new Map<CronScheduleEventType, Set<CronEventListener>>();

	emit(event: CronScheduleEvent): void {
		for (const listener of this.listeners) listener(event);
		for (const listener of this.listenersByType.get(event.type) ?? []) listener(event);
	}

	subscribe(listener: CronEventListener): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	subscribeToType(type: CronScheduleEventType, listener: CronEventListener): () => void {
		const listeners = this.listenersByType.get(type) ?? new Set<CronEventListener>();
		listeners.add(listener);
		this.listenersByType.set(type, listeners);
		return () => listeners.delete(listener);
	}
}

export class CronScheduleAuditLog implements CronAuditLog {
	constructor(private readonly store: CronScheduleStore) {}

	async append(entry: CronScheduleAuditEntry): Promise<void> {
		const schedule = await this.store.getSchedule(entry.scheduleId);
		await this.store.updateSchedule(entry.scheduleId, {
			audit: [...schedule.audit, entry],
			updatedAt: schedule.updatedAt,
		});
	}

	async list(scheduleId: CronScheduleId): Promise<CronScheduleAuditEntry[]> {
		return (await this.store.getSchedule(scheduleId)).audit;
	}
}

export class ScheduleLockManager {
	constructor(
		private readonly store: CronScheduleStore,
		private readonly runnerId: string,
		private readonly ttlMs: number
	) {}

	acquire(scheduleId: CronScheduleId): Promise<boolean> {
		return this.store.acquireScheduleLock(scheduleId, this.runnerId, this.ttlMs);
	}

	release(scheduleId: CronScheduleId): Promise<void> {
		return this.store.releaseScheduleLock(scheduleId, this.runnerId);
	}
}

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
