import { randomUUID } from 'node:crypto';
import type {
	CronJsonObject,
	OpenClawCronAddRequest,
	OpenClawCronDelivery,
	OpenClawCronDeliveryState,
	OpenClawCronJob,
	OpenClawCronJobDefinition,
	OpenClawCronJobState,
	OpenClawCronRunError,
	OpenClawCronRunRecord,
	OpenClawCronSessionTarget,
	OpenClawCronStatus,
	OpenClawCronToolRequest,
	OpenClawCronToolResponse,
	OpenClawCronUpdateRequest,
} from '../../../shared/cron';
import type { CronSchedule } from '../core/cron.types';
import { CronPermissionError, CronScheduleNotFoundError } from '../core/cron.errors';
import { CronNextRunCalculator } from '../scheduler/cron-next-run-calculator';
import type { OpenClawCronSnapshot, OpenClawCronStore } from './file-store';
import { defaultOpenClawCronJobState } from './file-store';
import {
	assertSafeCronId,
	assertTargetMatchesPayload,
	assertValidOpenClawJob,
	normalizeDelivery,
	openClawScheduleIdentity,
} from './validation';

export interface OpenClawCronLogger {
	info(scope: string, message: string, metadata?: unknown): void;
	warn(scope: string, message: string, metadata?: unknown): void;
	error(scope: string, message: string, metadata?: unknown): void;
}

export interface OpenClawCronActor {
	role: 'owner' | 'subagent' | 'http' | 'cron-self';
	jobId?: string;
	sessionId?: string;
}

export interface OpenClawCronExecutionOutcome {
	status: 'ok' | 'skipped';
	output?: string;
	skippedReason?: string;
	alreadyDelivered?: boolean;
	delivery?: OpenClawCronDeliveryState;
}

export interface OpenClawCronExecutor {
	execute(input: {
		job: OpenClawCronJobDefinition;
		runId: string;
		scheduledForMs: number;
		signal: AbortSignal;
	}): Promise<OpenClawCronExecutionOutcome>;
	cleanup?(job: OpenClawCronJobDefinition, run: OpenClawCronRunRecord): Promise<void>;
}

export interface OpenClawCronDeliveryPort {
	deliver(input: {
		job: OpenClawCronJobDefinition;
		run: Pick<OpenClawCronRunRecord, 'runId' | 'status' | 'error'>;
		output: string;
		delivery: OpenClawCronDelivery;
		failure: boolean;
	}): Promise<OpenClawCronDeliveryState>;
}

export interface OpenClawCronSchedulerOptions {
	enabled?: boolean;
	maintenanceIntervalMs?: number;
	minRefireGapMs?: number;
	stuckRunThresholdMs?: number;
	maxConcurrentRuns?: number;
	scheduleErrorDisableThreshold?: number;
	defaultOneShotMaxAttempts?: number;
	defaultBackoffMs?: number;
	defaultMaxBackoffMs?: number;
	defaultTimezone?: string;
	failureDestination?: OpenClawCronDelivery;
}

const DEFAULT_OPTIONS: Required<Omit<OpenClawCronSchedulerOptions, 'failureDestination'>> = {
	enabled: process.env.SKIP_CRON !== '1' && process.env.CRON_ENABLED !== 'false',
	maintenanceIntervalMs: 60_000,
	minRefireGapMs: 1_000,
	stuckRunThresholdMs: 30 * 60_000,
	maxConcurrentRuns: 1,
	scheduleErrorDisableThreshold: 3,
	defaultOneShotMaxAttempts: 3,
	defaultBackoffMs: 60_000,
	defaultMaxBackoffMs: 15 * 60_000,
	defaultTimezone: 'UTC',
};

export class NoopOpenClawCronExecutor implements OpenClawCronExecutor {
	async execute(input: { job: OpenClawCronJobDefinition }): Promise<OpenClawCronExecutionOutcome> {
		return {
			status: 'ok',
			output:
				input.job.payload.kind === 'agentTurn'
					? ''
					: input.job.payload.text,
		};
	}
}

export class NoopOpenClawCronDelivery implements OpenClawCronDeliveryPort {
	async deliver(input: {
		delivery: OpenClawCronDelivery;
	}): Promise<OpenClawCronDeliveryState> {
		return {
			mode: input.delivery.mode,
			status: input.delivery.mode === 'none' ? 'skipped' : 'sent',
			attemptedAtMs: Date.now(),
			target: {
				channel: input.delivery.channel,
				to: input.delivery.to,
				threadId: input.delivery.threadId,
				accountId: input.delivery.accountId,
			},
		};
	}
}

export class OpenClawCronScheduler {
	private readonly options: Required<Omit<OpenClawCronSchedulerOptions, 'failureDestination'>> & {
		failureDestination?: OpenClawCronDelivery;
	};
	private readonly calculator = new CronNextRunCalculator();
	private timer: NodeJS.Timeout | undefined;
	private started = false;
	private running = 0;

	constructor(
		private readonly store: OpenClawCronStore,
		private executor: OpenClawCronExecutor = new NoopOpenClawCronExecutor(),
		private delivery: OpenClawCronDeliveryPort = new NoopOpenClawCronDelivery(),
		options: OpenClawCronSchedulerOptions = {},
		private readonly logger?: OpenClawCronLogger
	) {
		this.options = { ...DEFAULT_OPTIONS, ...options };
	}

	setExecutor(executor: OpenClawCronExecutor): void {
		this.executor = executor;
	}

	setDelivery(delivery: OpenClawCronDeliveryPort): void {
		this.delivery = delivery;
	}

	async start(): Promise<void> {
		if (this.started) return;
		this.started = true;
		if (!this.options.enabled) {
			this.logger?.warn('OpenClawCron', 'Cron scheduler is globally disabled; jobs are persisted but timers will not arm.');
			return;
		}
		await this.recoverStartup();
		await this.processDue(Date.now());
		await this.armTimer();
	}

	async stop(): Promise<void> {
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
		this.started = false;
	}

	async status(actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronStatus> {
		this.authorize(actor, 'status');
		const snapshot = await this.store.load();
		const visibleJobs = this.visibleJobs(snapshot, actor);
		const nextRunAtMs = visibleJobs
			.map((job) => snapshot.states[job.id]?.nextRunAtMs)
			.filter((value): value is number => typeof value === 'number')
			.sort((a, b) => a - b)[0];
		return {
			enabled: this.options.enabled,
			timerArmed: Boolean(this.timer),
			jobCount: visibleJobs.length,
			runningCount: visibleJobs.filter((job) => snapshot.states[job.id]?.runningAtMs).length,
			nextRunAtMs,
			warning: this.options.enabled ? undefined : 'Cron jobs are saved but automatic execution is disabled.',
		};
	}

	async list(include: 'enabled' | 'disabled' | 'all' = 'enabled', actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronJob[]> {
		this.authorize(actor, 'list');
		const snapshot = await this.store.load();
		return this.visibleJobs(snapshot, actor)
			.filter((job) => {
				if (include === 'all') return true;
				return include === 'enabled' ? job.enabled : !job.enabled;
			})
			.map((job) => this.join(job, snapshot.states[job.id]));
	}

	async get(jobId: string, actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronJob> {
		this.authorize(actor, 'get', jobId);
		const snapshot = await this.store.load();
		const job = this.requireJob(snapshot, jobId);
		return this.join(job, snapshot.states[job.id]);
	}

	async add(request: OpenClawCronAddRequest, actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronJob> {
		this.authorize(actor, 'add');
		const snapshot = await this.store.load();
		const now = Date.now();
		const id = request.id ?? randomUUID();
		assertSafeCronId(id);
		if (snapshot.jobs.some((job) => job.id === id)) {
			throw new Error(`Cron job already exists: ${id}`);
		}
		const sessionTarget = this.resolveSessionTarget(request.sessionTarget, request.payload, actor.sessionId);
		const job: OpenClawCronJobDefinition = {
			id,
			name: request.name.trim(),
			description: request.description?.trim() ?? '',
			enabled: request.enabled ?? true,
			createdAtMs: now,
			updatedAtMs: now,
			schedule: request.schedule,
			sessionTarget,
			wakeMode: request.wakeMode ?? 'now',
			payload: request.payload,
			delivery: normalizeDelivery(request.payload, sessionTarget, request.delivery),
			failureAlert: request.failureAlert,
			agentId: request.agentId,
			sessionKey: request.sessionKey,
			deleteAfterRun: request.deleteAfterRun ?? (request.schedule.kind === 'at' ? true : undefined),
			maxAttempts: request.maxAttempts,
			backoffMs: request.backoffMs,
			maxBackoffMs: request.maxBackoffMs,
		};
		assertValidOpenClawJob(job);
		const state = defaultOpenClawCronJobState(job);
		if (job.enabled) {
			state.nextRunAtMs = this.computeNextRun(job, state, now, true);
		}
		snapshot.jobs.push(job);
		snapshot.states[job.id] = state;
		await this.store.save(snapshot);
		await this.armTimer();
		return this.join(job, state);
	}

	async update(
		jobId: string,
		patch: OpenClawCronUpdateRequest,
		actor: OpenClawCronActor = { role: 'owner' }
	): Promise<OpenClawCronJob> {
		this.authorize(actor, 'update', jobId);
		const snapshot = await this.store.load();
		const index = snapshot.jobs.findIndex((job) => job.id === jobId);
		if (index === -1) throw new CronScheduleNotFoundError(jobId);
		const current = snapshot.jobs[index]!;
		const payload = patch.payload ?? current.payload;
		const sessionTarget = this.resolveSessionTarget(
			patch.sessionTarget ?? current.sessionTarget,
			payload,
			actor.sessionId
		);
		const job: OpenClawCronJobDefinition = {
			...current,
			...patch,
			description: patch.description ?? current.description,
			payload,
			sessionTarget,
			delivery: patch.delivery
				? normalizeDelivery(payload, sessionTarget, { ...current.delivery, ...patch.delivery })
				: current.delivery,
			updatedAtMs: Date.now(),
		};
		assertValidOpenClawJob(job);
		const state = snapshot.states[jobId] ?? defaultOpenClawCronJobState(job);
		const identity = openClawScheduleIdentity(job.schedule);
		if (state.scheduleIdentity !== identity) {
			state.nextRunAtMs = undefined;
			state.runningAtMs = undefined;
			state.scheduleIdentity = identity;
		}
		if (job.enabled === false) {
			state.nextRunAtMs = undefined;
			state.runningAtMs = undefined;
		} else if (patch.enabled === true || patch.schedule || state.nextRunAtMs === undefined) {
			state.nextRunAtMs = this.computeNextRun(job, state, Date.now(), true);
		}
		snapshot.jobs[index] = job;
		snapshot.states[jobId] = state;
		await this.store.save(snapshot);
		await this.armTimer();
		return this.join(job, state);
	}

	async remove(jobId: string, actor: OpenClawCronActor = { role: 'owner' }): Promise<void> {
		this.authorize(actor, 'remove', jobId);
		const snapshot = await this.store.load();
		snapshot.jobs = snapshot.jobs.filter((job) => job.id !== jobId);
		delete snapshot.states[jobId];
		await this.store.save(snapshot);
		await this.armTimer();
	}

	async run(
		jobId: string,
		mode: 'force' | 'due' = 'force',
		actor: OpenClawCronActor = { role: 'owner' }
	): Promise<OpenClawCronRunRecord> {
		this.authorize(actor, 'run', jobId);
		const snapshot = await this.store.load();
		const job = this.requireJob(snapshot, jobId);
		const state = snapshot.states[job.id] ?? defaultOpenClawCronJobState(job);
		const now = Date.now();
		if (mode === 'due' && (!state.nextRunAtMs || state.nextRunAtMs > now)) {
			const run = this.skippedRun(job, state.nextRunAtMs ?? now, 'manual-due', 'not_due');
			await this.store.appendRun(run);
			return run;
		}
		return this.executeJob(job.id, state.nextRunAtMs ?? now, mode === 'due' ? 'manual-due' : 'manual-force');
	}

	async runs(jobId: string, limit = 50, actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronRunRecord[]> {
		this.authorize(actor, 'runs', jobId);
		return this.store.listRuns(jobId, limit);
	}

	async wake(actor: OpenClawCronActor = { role: 'owner' }): Promise<OpenClawCronStatus> {
		this.authorize(actor, 'wake');
		if (this.options.enabled) {
			await this.processDue(Date.now());
			await this.armTimer();
		}
		return this.status(actor);
	}

	async handleToolAction(
		request: OpenClawCronToolRequest,
		actor: OpenClawCronActor = { role: 'owner' }
	): Promise<OpenClawCronToolResponse> {
		try {
			const result = await this.handleToolActionOrThrow(request, actor);
			return {
				status: 'ok',
				enabled: this.options.enabled,
				warning: this.options.enabled ? undefined : 'Cron jobs are saved but automatic execution is disabled.',
				result,
			};
		} catch (error) {
			return {
				status: 'error',
				enabled: this.options.enabled,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	async recoverStartup(): Promise<void> {
		const now = Date.now();
		const snapshot = await this.store.load();
		let changed = false;
		for (const job of snapshot.jobs) {
			const state = snapshot.states[job.id] ?? defaultOpenClawCronJobState(job);
			if (state.runningAtMs) {
				const run: OpenClawCronRunRecord = {
					runId: randomUUID(),
					jobId: job.id,
					status: 'error',
					mode: 'startup-recovery',
					scheduledForMs: state.nextRunAtMs ?? state.runningAtMs,
					startedAtMs: state.runningAtMs,
					finishedAtMs: now,
					attempt: state.attempts + 1,
					error: {
						code: 'CRON_INTERRUPTED',
						message: 'Cron run was interrupted by Gateway restart.',
						permanent: false,
					},
				};
				await this.store.appendRun(run);
				state.runningAtMs = undefined;
				state.lastRunStatus = 'error';
				state.lastError = run.error;
				state.consecutiveErrors += 1;
				state.nextRunAtMs = this.nextAfterError(job, state, now);
				changed = true;
			}
			if (job.enabled && !state.nextRunAtMs && !state.runningAtMs) {
				this.refreshNextRun(job, state, now);
				changed = true;
			}
			snapshot.states[job.id] = state;
		}
		if (changed) await this.store.save(snapshot);
	}

	async processDue(now = Date.now()): Promise<void> {
		if (!this.options.enabled) return;
		const snapshot = await this.store.load();
		let changed = this.sweepStaleRunning(snapshot, now);
		for (const job of snapshot.jobs) {
			const state = snapshot.states[job.id] ?? defaultOpenClawCronJobState(job);
			if (job.enabled && !state.runningAtMs && state.nextRunAtMs === undefined) {
				this.refreshNextRun(job, state, now);
				snapshot.states[job.id] = state;
				changed = true;
			}
		}
		if (changed) await this.store.save(snapshot);
		const due = snapshot.jobs
			.filter((job) => {
				const state = snapshot.states[job.id];
				return Boolean(job.enabled && state?.nextRunAtMs !== undefined && state.nextRunAtMs <= now && !state.runningAtMs);
			})
			.sort((a, b) => (snapshot.states[a.id]?.nextRunAtMs ?? 0) - (snapshot.states[b.id]?.nextRunAtMs ?? 0))
			.slice(0, Math.max(1, this.options.maxConcurrentRuns - this.running));
		for (const job of due) {
			const scheduledForMs = snapshot.states[job.id]?.nextRunAtMs ?? now;
			await this.executeJob(job.id, scheduledForMs, 'automatic');
		}
	}

	private async handleToolActionOrThrow(
		request: OpenClawCronToolRequest,
		actor: OpenClawCronActor
	): Promise<OpenClawCronToolResponse['result']> {
		switch (request.action) {
			case 'status':
				return this.status(actor);
			case 'list':
				return this.list(request.include ?? 'enabled', actor);
			case 'get':
				return this.get(request.jobId, actor);
			case 'add':
				return this.add(request.job, actor);
			case 'update':
				return this.update(request.jobId, request.patch, actor);
			case 'remove':
				await this.remove(request.jobId, actor);
				return { removed: true, jobId: request.jobId };
			case 'run':
				return this.run(request.jobId, request.force ? 'force' : request.mode ?? 'force', actor);
			case 'runs':
				return this.runs(request.jobId, request.limit, actor);
			case 'wake': {
				const status = await this.wake(actor);
				return { woken: true, status };
			}
		}
	}

	private async executeJob(
		jobId: string,
		scheduledForMs: number,
		mode: OpenClawCronRunRecord['mode']
	): Promise<OpenClawCronRunRecord> {
		let snapshot = await this.store.load();
		const job = this.requireJob(snapshot, jobId);
		const state = snapshot.states[job.id] ?? defaultOpenClawCronJobState(job);
		const now = Date.now();
		if (state.runningAtMs && now - state.runningAtMs <= this.options.stuckRunThresholdMs) {
			const run = this.skippedRun(job, scheduledForMs, mode, 'already_running');
			await this.store.appendRun(run);
			return run;
		}
		state.runningAtMs = now;
		state.attempts += 1;
		snapshot.states[job.id] = state;
		await this.store.save(snapshot);

		this.running += 1;
		const runId = randomUUID();
		const controller = new AbortController();
		const timeoutMs = job.payload.kind === 'agentTurn' && job.payload.timeoutSeconds
			? job.payload.timeoutSeconds * 1000
			: undefined;
		const timeout = timeoutMs
			? setTimeout(() => controller.abort(), timeoutMs)
			: undefined;
		try {
			const outcome = await this.executor.execute({
				job,
				runId,
				scheduledForMs,
				signal: controller.signal,
			});
			const finishedAtMs = Date.now();
			const run = await this.completeRun(job, scheduledForMs, mode, runId, finishedAtMs, outcome);
			await this.executor.cleanup?.(job, run);
			return run;
		} catch (error) {
			const finishedAtMs = Date.now();
			return this.failRun(job, scheduledForMs, mode, runId, finishedAtMs, error);
		} finally {
			if (timeout) clearTimeout(timeout);
			this.running = Math.max(0, this.running - 1);
			await this.armTimer();
		}
	}

	private async completeRun(
		job: OpenClawCronJobDefinition,
		scheduledForMs: number,
		mode: OpenClawCronRunRecord['mode'],
		runId: string,
		finishedAtMs: number,
		outcome: OpenClawCronExecutionOutcome
	): Promise<OpenClawCronRunRecord> {
		if (outcome.status === 'skipped') {
			const run = this.skippedRun(job, scheduledForMs, mode, outcome.skippedReason ?? 'executor_skipped', runId, finishedAtMs);
			await this.applyRunResult(job, run);
			return run;
		}

		const baseRun: OpenClawCronRunRecord = {
			runId,
			jobId: job.id,
			status: 'ok',
			mode,
			scheduledForMs,
			startedAtMs: scheduledForMs,
			finishedAtMs,
			attempt: 1,
			output: outcome.output,
			alreadyDelivered: outcome.alreadyDelivered,
			delivery: outcome.delivery,
		};
		const deliveryState = await this.resolveDelivery(job, baseRun, outcome);
		const run = { ...baseRun, delivery: deliveryState };
		await this.applyRunResult(job, run);
		return run;
	}

	private async failRun(
		job: OpenClawCronJobDefinition,
		scheduledForMs: number,
		mode: OpenClawCronRunRecord['mode'],
		runId: string,
		finishedAtMs: number,
		error: unknown
	): Promise<OpenClawCronRunRecord> {
		const run: OpenClawCronRunRecord = {
			runId,
			jobId: job.id,
			status: 'error',
			mode,
			scheduledForMs,
			startedAtMs: scheduledForMs,
			finishedAtMs,
			attempt: 1,
			error: this.toRunError(error),
		};
		await this.applyRunResult(job, run);
		return run;
	}

	private async applyRunResult(job: OpenClawCronJobDefinition, run: OpenClawCronRunRecord): Promise<void> {
		const snapshot = await this.store.load();
		const index = snapshot.jobs.findIndex((entry) => entry.id === job.id);
		if (index === -1) {
			await this.store.appendRun(run);
			return;
		}
		const currentJob = snapshot.jobs[index]!;
		const state = snapshot.states[job.id] ?? defaultOpenClawCronJobState(currentJob);
		state.runningAtMs = undefined;
		state.lastRunAtMs = run.finishedAtMs;
		state.lastRunStatus = run.status;
		state.delivery = run.delivery;
		state.lastError = run.error;

		if (run.status === 'ok') {
			state.consecutiveErrors = 0;
			state.consecutiveSkipped = 0;
			state.consecutiveScheduleErrors = 0;
			state.attempts = 0;
			state.lastFailureAlertAtMs = undefined;
			if (currentJob.schedule.kind === 'at' && currentJob.deleteAfterRun !== false) {
				snapshot.jobs.splice(index, 1);
				delete snapshot.states[job.id];
			} else {
				state.nextRunAtMs = this.computeNextAfterSuccess(currentJob, state, run.finishedAtMs);
				snapshot.states[job.id] = state;
			}
		} else if (run.status === 'skipped') {
			state.consecutiveSkipped += 1;
			state.consecutiveErrors = 0;
			if (currentJob.schedule.kind === 'at') {
				currentJob.enabled = false;
				state.nextRunAtMs = undefined;
			} else {
				state.nextRunAtMs = this.computeNextAfterSuccess(currentJob, state, run.finishedAtMs);
			}
			snapshot.jobs[index] = { ...currentJob, updatedAtMs: Date.now() };
			snapshot.states[job.id] = state;
			await this.maybeAlertFailure(currentJob, state, run);
		} else {
			state.consecutiveErrors += 1;
			state.consecutiveSkipped = 0;
			const exhausted = currentJob.schedule.kind === 'at' && state.attempts >= this.maxAttempts(currentJob);
			if (currentJob.schedule.kind === 'at' && (run.error?.permanent || exhausted)) {
				currentJob.enabled = false;
				state.nextRunAtMs = undefined;
			} else {
				state.nextRunAtMs = this.nextAfterError(currentJob, state, run.finishedAtMs);
			}
			snapshot.jobs[index] = { ...currentJob, updatedAtMs: Date.now() };
			snapshot.states[job.id] = state;
			await this.maybeAlertFailure(currentJob, state, run);
		}
		await this.store.appendRun(run);
		await this.store.save(snapshot);
	}

	private async resolveDelivery(
		job: OpenClawCronJobDefinition,
		run: OpenClawCronRunRecord,
		outcome: OpenClawCronExecutionOutcome
	): Promise<OpenClawCronDeliveryState | undefined> {
		if (outcome.delivery) return outcome.delivery;
		if (outcome.alreadyDelivered) {
			return {
				mode: job.delivery.mode,
				status: 'skipped',
				attemptedAtMs: Date.now(),
				duplicateSuppressed: true,
			};
		}
		if (!outcome.output || job.delivery.mode === 'none') return undefined;
		try {
			return await this.delivery.deliver({
				job,
				run,
				output: outcome.output,
				delivery: job.delivery,
				failure: false,
			});
		} catch (error) {
			if (!job.delivery.bestEffort) throw error;
			return {
				mode: job.delivery.mode,
				status: 'failed',
				attemptedAtMs: Date.now(),
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}

	private async maybeAlertFailure(
		job: OpenClawCronJobDefinition,
		state: OpenClawCronJobState,
		run: OpenClawCronRunRecord
	): Promise<void> {
		if (run.status === 'skipped' && !job.failureAlert?.includeSkipped) return;
		const threshold = job.failureAlert?.threshold ?? 1;
		const count = run.status === 'skipped' ? state.consecutiveSkipped : state.consecutiveErrors;
		if (count < threshold) return;
		const cooldownMs = job.failureAlert?.cooldownMs ?? 15 * 60_000;
		if (state.lastFailureAlertAtMs && Date.now() - state.lastFailureAlertAtMs < cooldownMs) return;
		const delivery = this.failureDelivery(job);
		if (!delivery || delivery.mode === 'none') return;
		state.lastFailureAlertAtMs = Date.now();
		try {
			await this.delivery.deliver({
				job,
				run,
				output: `Cron job "${job.name}" ${run.status}: ${run.error?.message ?? run.skippedReason ?? 'no details'}`,
				delivery,
				failure: true,
			});
		} catch (error) {
			this.logger?.warn('OpenClawCron', 'Failure alert delivery failed.', {
				jobId: job.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private failureDelivery(job: OpenClawCronJobDefinition): OpenClawCronDelivery | undefined {
		const explicit = job.failureAlert?.target;
		if (explicit) {
			return {
				mode: job.failureAlert?.mode ?? 'announce',
				url: explicit.url,
				channel: explicit.channel,
				to: explicit.to,
				threadId: explicit.threadId,
				accountId: explicit.accountId,
				bestEffort: true,
			};
		}
		const jobDestination = job.delivery.failureDestination;
		if (jobDestination) {
			return {
				mode: jobDestination.mode ?? 'announce',
				url: jobDestination.url,
				channel: jobDestination.channel,
				to: jobDestination.to,
				threadId: jobDestination.threadId,
				accountId: jobDestination.accountId,
				bestEffort: true,
			};
		}
		if (this.options.failureDestination) return this.options.failureDestination;
		if (job.delivery.mode === 'announce') return job.delivery;
		return undefined;
	}

	private skippedRun(
		job: OpenClawCronJobDefinition,
		scheduledForMs: number,
		mode: OpenClawCronRunRecord['mode'],
		reason: string,
		runId = randomUUID(),
		finishedAtMs = Date.now()
	): OpenClawCronRunRecord {
		return {
			runId,
			jobId: job.id,
			status: 'skipped',
			mode,
			scheduledForMs,
			startedAtMs: finishedAtMs,
			finishedAtMs,
			attempt: 0,
			skippedReason: reason,
		};
	}

	private computeNextAfterSuccess(
		job: OpenClawCronJobDefinition,
		state: OpenClawCronJobState,
		fromMs: number
	): number | undefined {
		const next = this.computeNextRun(job, state, fromMs, false);
		if (next === undefined) return undefined;
		return Math.max(next, fromMs + this.options.minRefireGapMs);
	}

	private nextAfterError(job: OpenClawCronJobDefinition, state: OpenClawCronJobState, now: number): number {
		const base = Math.max(0, job.backoffMs ?? this.options.defaultBackoffMs);
		const max = Math.max(base, job.maxBackoffMs ?? this.options.defaultMaxBackoffMs);
		const multiplier = 2 ** Math.max(0, state.consecutiveErrors - 1);
		return now + Math.min(max, base * multiplier);
	}

	private refreshNextRun(job: OpenClawCronJobDefinition, state: OpenClawCronJobState, now: number): void {
		try {
			state.nextRunAtMs = this.computeNextRun(job, state, now, true);
			state.consecutiveScheduleErrors = 0;
			state.lastError = undefined;
		} catch (error) {
			state.consecutiveScheduleErrors += 1;
			state.lastRunStatus = 'error';
			state.lastError = this.toRunError(error, 'CRON_SCHEDULE_ERROR');
			if (state.consecutiveScheduleErrors >= this.options.scheduleErrorDisableThreshold) {
				job.enabled = false;
				state.nextRunAtMs = undefined;
			}
		}
	}

	private computeNextRun(
		job: OpenClawCronJobDefinition,
		state: OpenClawCronJobState,
		fromMs: number,
		allowPastAt: boolean
	): number | undefined {
		if (!job.enabled) return undefined;
		if (job.schedule.kind === 'at') {
			if (state.lastRunAtMs) return undefined;
			const at = Date.parse(job.schedule.at);
			if (!Number.isFinite(at)) throw new Error('Invalid at schedule timestamp.');
			return allowPastAt ? at : at > fromMs ? at : undefined;
		}
		if (job.schedule.kind === 'every') {
			const interval = Math.max(job.schedule.intervalMs, this.options.minRefireGapMs);
			const anchor = state.lastRunAtMs ?? job.createdAtMs;
			if (anchor > fromMs) return anchor;
			const periods = Math.floor((fromMs - anchor) / interval) + 1;
			return anchor + periods * interval;
		}
		const timezone = job.schedule.timezone ?? this.options.defaultTimezone;
		const next = this.calculator.getNextRun(
			{
				id: job.id,
				name: job.name,
				type: 'cron',
				status: 'active',
				source: 'agent',
				createdBy: 'cron',
				visibility: 'private',
				timezone,
				cronExpression: job.schedule.expression,
				runCount: 0,
				missedRunPolicy: 'skip',
				concurrencyPolicy: 'skipIfRunning',
				retryPolicy: {
					maxAttempts: 1,
					initialDelayMs: 0,
					maxDelayMs: 0,
					backoffMultiplier: 1,
					jitter: false,
					retryableErrorCodes: [],
					nonRetryableErrorCodes: [],
				},
				taskType: 'cron.agentTurn',
				taskInput: {},
				taskPriority: 'normal',
				taskTags: [],
				taskMetadata: {},
				requiredPermissions: [],
				requiresConfirmation: false,
				enabled: job.enabled,
				createdAt: new Date(job.createdAtMs).toISOString(),
				updatedAt: new Date(job.updatedAtMs).toISOString(),
				metadata: {},
				audit: [],
			} satisfies CronSchedule,
			new Date(fromMs)
		);
		if (!next) return undefined;
		return next.getTime() + (job.schedule.staggerMs ?? 0) + this.stableJitter(job.id, job.schedule.jitterMs ?? 0);
	}

	private sweepStaleRunning(snapshot: OpenClawCronSnapshot, now: number): boolean {
		let changed = false;
		for (const job of snapshot.jobs) {
			const state = snapshot.states[job.id];
			if (!state?.runningAtMs || now - state.runningAtMs <= this.options.stuckRunThresholdMs) continue;
			state.runningAtMs = undefined;
			state.lastRunStatus = 'error';
			state.lastError = {
				code: 'CRON_STUCK_RUN',
				message: 'Cron run exceeded the stuck-run threshold.',
				permanent: false,
			};
			state.consecutiveErrors += 1;
			state.nextRunAtMs = this.nextAfterError(job, state, now);
			changed = true;
		}
		return changed;
	}

	private async armTimer(): Promise<void> {
		if (this.timer) clearTimeout(this.timer);
		this.timer = undefined;
		if (!this.started || !this.options.enabled) return;
		const snapshot = await this.store.load();
		const next = snapshot.jobs
			.map((job) => snapshot.states[job.id]?.nextRunAtMs)
			.filter((value): value is number => typeof value === 'number')
			.sort((a, b) => a - b)[0];
		const delayMs = Math.max(
			this.options.minRefireGapMs,
			Math.min(this.options.maintenanceIntervalMs, next === undefined ? this.options.maintenanceIntervalMs : next - Date.now())
		);
		this.timer = setTimeout(() => {
			void this.processDue(Date.now()).catch((error) => {
				this.logger?.error('OpenClawCron', 'Cron tick failed.', error);
			});
		}, delayMs);
		this.timer.unref?.();
	}

	private visibleJobs(snapshot: OpenClawCronSnapshot, actor: OpenClawCronActor): OpenClawCronJobDefinition[] {
		if (actor.role === 'cron-self') {
			return snapshot.jobs.filter((job) => job.id === actor.jobId);
		}
		return snapshot.jobs;
	}

	private requireJob(snapshot: OpenClawCronSnapshot, jobId: string): OpenClawCronJobDefinition {
		assertSafeCronId(jobId, 'jobId');
		const job = snapshot.jobs.find((entry) => entry.id === jobId);
		if (!job) throw new CronScheduleNotFoundError(jobId);
		return job;
	}

	private join(job: OpenClawCronJobDefinition, state?: OpenClawCronJobState): OpenClawCronJob {
		return { ...job, state: state ?? defaultOpenClawCronJobState(job) };
	}

	private authorize(actor: OpenClawCronActor, action: OpenClawCronToolRequest['action'], jobId?: string): void {
		if (actor.role === 'owner') return;
		if (actor.role === 'cron-self') {
			if (action === 'status' || action === 'list') return;
			if (jobId && actor.jobId === jobId && ['get', 'runs', 'remove'].includes(action)) return;
		}
		throw new CronPermissionError('Cron is owner-only for this caller.', {
			action,
			jobId: jobId ?? null,
			role: actor.role,
		} as CronJsonObject);
	}

	private resolveSessionTarget(
		target: OpenClawCronSessionTarget | undefined,
		payload: OpenClawCronJobDefinition['payload'],
		currentSessionId?: string
	): OpenClawCronSessionTarget {
		const inferred = target ?? (payload.kind === 'systemEvent' ? 'main' : 'isolated');
		const resolved = inferred === 'current'
			? currentSessionId
				? `session:${currentSessionId}` as const
				: 'isolated'
			: inferred;
		assertTargetMatchesPayload(resolved, payload);
		return resolved;
	}

	private maxAttempts(job: OpenClawCronJobDefinition): number {
		return job.maxAttempts ?? this.options.defaultOneShotMaxAttempts;
	}

	private stableJitter(id: string, max: number): number {
		if (max <= 0) return 0;
		let hash = 0;
		for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
		return hash % (Math.floor(max) + 1);
	}

	private toRunError(error: unknown, fallbackCode = 'CRON_RUN_ERROR'): OpenClawCronRunError {
		if (error && typeof error === 'object') {
			const record = error as { code?: unknown; message?: unknown; permanent?: unknown; name?: unknown };
			return {
				code: typeof record.code === 'string' ? record.code : fallbackCode,
				message: typeof record.message === 'string' ? record.message : 'Cron run failed.',
				permanent: Boolean(record.permanent),
			};
		}
		return {
			code: fallbackCode,
			message: String(error),
			permanent: false,
		};
	}
}
