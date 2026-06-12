import type {
	CronSchedule,
	CronScheduleRunner,
	CronScheduleStore,
	CronScheduledTask,
} from './types';
import type { CronLogger } from './logger';
import { CronScheduleExecutionError, CronSchedulerError } from './errors';
import { assertScheduleCanRun } from './validation';
import { delay } from './retry';
import { CronNextRunCalculator } from '../calculator';
import { CronScheduleEventRecorder } from './events';
import { CronScheduleRunRecorder } from './recording';

interface CronScheduleTriggerOptions {
	runnerId: string;
	lockTtlMs: number;
}

export class CronScheduleTrigger {
	constructor(
		private readonly store: CronScheduleStore,
		private readonly runner: CronScheduleRunner,
		private readonly calculator: CronNextRunCalculator,
		private readonly events: CronScheduleEventRecorder,
		private readonly runs: CronScheduleRunRecorder,
		private readonly options: CronScheduleTriggerOptions,
		private readonly logger?: CronLogger
	) {}

	async trigger(
		inputSchedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		manual: boolean
	): Promise<CronScheduledTask | undefined> {
		const locked = await this.store.acquireScheduleLock(
			inputSchedule.id,
			this.options.runnerId,
			this.options.lockTtlMs
		);
		if (!locked) return undefined;

		try {
			const schedule = await this.store.getSchedule(inputSchedule.id);
			if (!manual) assertScheduleCanRun(schedule);

			await this.events.emit({
				scheduleId: schedule.id,
				type: 'schedule.due',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Schedule is due.',
				metadata: { scheduledRunAt, missedRun },
			});

			const idempotencyKey = this.runs.idempotencyKey(schedule.id, scheduledRunAt);
			const existingExecution = await this.store.getExecutionByIdempotencyKey(idempotencyKey);
			if (existingExecution) {
				await this.events.emit({
					scheduleId: schedule.id,
					type: 'schedule.skipped',
					userId: schedule.ownerUserId,
					source: schedule.source,
					message: 'Duplicate scheduled run ignored.',
					metadata: { idempotencyKey },
				});
				return undefined;
			}

			const existingTask = await this.runner.findExistingTask?.({
				scheduleId: schedule.id,
				scheduledRunAt,
			});
			if (existingTask) {
				await this.runs.record(
					schedule,
					idempotencyKey,
					scheduledRunAt,
					'duplicateIgnored',
					missedRun,
					{ taskId: existingTask.id }
				);
				return undefined;
			}

			const concurrencyDecision = await this.applyConcurrencyPolicy(
				schedule,
				scheduledRunAt,
				missedRun
			);
			if (concurrencyDecision === 'skipped') return undefined;

			const task = await this.createTaskWithRetry(
				schedule,
				scheduledRunAt,
				missedRun,
				idempotencyKey
			);
			const updated = await this.updateScheduleAfterTrigger(schedule, scheduledRunAt);
			await this.runs.record(updated, idempotencyKey, scheduledRunAt, 'taskCreated', missedRun, {
				taskId: task.id,
			});
			await this.events.emit({
				scheduleId: schedule.id,
				type: 'schedule.triggered',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Scheduled task created.',
				metadata: { taskId: task.id, scheduledRunAt, nextRunAt: updated.nextRunAt ?? null },
			});
			return task;
		} catch (error) {
			await this.runs.recordFailure(inputSchedule, scheduledRunAt, missedRun, error);
			this.logger?.error('CronScheduler', `Failed to trigger schedule ${inputSchedule.id}.`, error);
			if (error instanceof CronSchedulerError && !error.retryable) return undefined;
			return undefined;
		} finally {
			await this.store.releaseScheduleLock(inputSchedule.id, this.options.runnerId);
		}
	}

	private async applyConcurrencyPolicy(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean
	): Promise<'proceed' | 'skipped'> {
		const running = await this.runner.listRunningTasks?.(schedule.id);
		if (!running || running.length === 0 || schedule.concurrencyPolicy === 'allowOverlap')
			return 'proceed';

		if (schedule.concurrencyPolicy === 'skipIfRunning') {
			const idempotencyKey = this.runs.idempotencyKey(schedule.id, scheduledRunAt);
			await this.runs.record(schedule, idempotencyKey, scheduledRunAt, 'skipped', missedRun, {
				reason: 'concurrency',
				runningTaskIds: running.map((task) => task.id),
			});
			const updated = await this.updateScheduleAfterTrigger(schedule, scheduledRunAt);
			await this.events.emit({
				scheduleId: schedule.id,
				type: 'schedule.skipped',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Skipped because a previous run is still active.',
				metadata: { nextRunAt: updated.nextRunAt ?? null },
			});
			return 'skipped';
		}

		if (['cancelPrevious', 'replacePrevious'].includes(schedule.concurrencyPolicy)) {
			await this.runner.cancelRunningTasks?.(schedule.id, 'Superseded by a newer scheduled run.');
		}

		return 'proceed';
	}

	private async createTaskWithRetry(
		schedule: CronSchedule,
		scheduledRunAt: string,
		missedRun: boolean,
		idempotencyKey: string
	): Promise<CronScheduledTask> {
		const maxAttempts = Math.max(1, schedule.retryPolicy.maxAttempts);
		let attempt = 0;
		let lastError: unknown;
		while (attempt < maxAttempts) {
			attempt++;
			try {
				return await this.runner.createTaskForSchedule({
					schedule,
					scheduledRunAt,
					actualTriggeredAt: new Date().toISOString(),
					runNumber: schedule.runCount + 1,
					missedRun,
					idempotencyKey,
					runnerId: this.options.runnerId,
				});
			} catch (error) {
				lastError = error;
				if (attempt >= maxAttempts) break;
				const backoff = Math.min(
					schedule.retryPolicy.maxDelayMs,
					Math.round(
						schedule.retryPolicy.initialDelayMs *
							schedule.retryPolicy.backoffMultiplier ** (attempt - 1)
					)
				);
				await delay(
					schedule.retryPolicy.jitter ? Math.round(backoff * (0.75 + Math.random() * 0.5)) : backoff
				);
			}
		}
		throw new CronScheduleExecutionError('Task creation failed after retry attempts.', {
			error: lastError instanceof Error ? lastError.message : String(lastError),
		});
	}

	private async updateScheduleAfterTrigger(
		schedule: CronSchedule,
		scheduledRunAt: string
	): Promise<CronSchedule> {
		const now = new Date().toISOString();
		const runCount = schedule.runCount + 1;
		const base: CronSchedule = {
			...schedule,
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: now,
		};
		const completed =
			schedule.type === 'oneTime' ||
			(schedule.maxRuns !== undefined && runCount >= schedule.maxRuns);
		const nextRunAt = completed
			? undefined
			: this.calculator.getNextRun(base, new Date(scheduledRunAt))?.toISOString();
		const status = completed ? 'completed' : schedule.status;
		const updated = await this.store.updateSchedule(schedule.id, {
			runCount,
			lastRunAt: scheduledRunAt,
			lastEvaluatedAt: now,
			nextRunAt,
			status,
			updatedAt: now,
		});
		if (completed) {
			await this.events.emit({
				scheduleId: schedule.id,
				type: 'schedule.completed',
				userId: schedule.ownerUserId,
				source: schedule.source,
				message: 'Schedule completed.',
				metadata: { runCount },
			});
		}
		return updated;
	}
}
