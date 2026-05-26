import type { CronScheduledTask } from '../../../../src/shared/cron';
import {
	CronScheduleExecutionError,
	CronScheduleValidationError,
	CronSchedulerService,
	DefaultCronScheduleAccessPolicy,
	InMemoryCronScheduleStore,
	redactCronValue,
	TaskManagerCronScheduleRunner,
	type CronActorContext,
	type CronSchedule,
	type CronScheduleCreateRequest,
	type CronScheduleRunner,
} from '../../../../src/main/cron';
import { EventBus } from '../../../../src/main/core';
import { AGENT_TASK_TYPE, TaskManager, TaskRegistry } from '../../../../src/main/tasks';
import type { TaskContext } from '../../../../src/shared/tasks';

class RecordingRunner implements CronScheduleRunner {
	tasks: CronScheduledTask[] = [];
	running: CronScheduledTask[] = [];
	failuresBeforeSuccess = 0;
	failureError: Error = new CronScheduleExecutionError('transient create failure', {}, true);
	createAttempts = 0;
	cancelled: string[] = [];

	async createTaskForSchedule(
		input: Parameters<CronScheduleRunner['createTaskForSchedule']>[0]
	): Promise<CronScheduledTask> {
		this.createAttempts++;
		if (this.failuresBeforeSuccess > 0) {
			this.failuresBeforeSuccess--;
			throw this.failureError;
		}
		const task = {
			id: `task-${this.tasks.length + 1}`,
			type: input.schedule.taskType,
			source: 'cron',
			sourceId: input.schedule.id,
			status: 'queued',
			metadata: {
				cronScheduleId: input.schedule.id,
				scheduledRunAt: input.scheduledRunAt,
				idempotencyKey: input.idempotencyKey,
			},
		} as CronScheduledTask;
		this.tasks.push(task);
		return task;
	}

	async findExistingTask(filter: {
		scheduleId: string;
		scheduledRunAt: string;
	}): Promise<CronScheduledTask | undefined> {
		return this.tasks.find(
			(task) =>
				task.metadata.cronScheduleId === filter.scheduleId &&
				task.metadata.scheduledRunAt === filter.scheduledRunAt
		);
	}

	async listRunningTasks(): Promise<CronScheduledTask[]> {
		return this.running;
	}

	async cancelRunningTasks(scheduleId: string): Promise<void> {
		this.cancelled.push(scheduleId);
		this.running = [];
	}
}

const actor: CronActorContext = {
	source: 'ui',
	userId: 'user-1',
	timezone: 'Europe/Rome',
	permissions: [
		'createSchedule',
		'updateSchedule',
		'deleteSchedule',
		'pauseSchedule',
		'resumeSchedule',
		'listSchedules',
		'runScheduleNow',
		'scheduleReadPrivateData',
	],
};

function makeScheduler(runner = new RecordingRunner()) {
	const store = new InMemoryCronScheduleStore();
	const policy = new DefaultCronScheduleAccessPolicy({
		minIntervalMs: 60_000,
		highFrequencyThresholdMs: 5 * 60_000,
		maxActiveSchedulesPerUser: 50,
	});
	const scheduler = new CronSchedulerService(store, runner, policy, {
		runnerId: 'test-runner',
		pollIntervalMs: 60_000,
		lockTtlMs: 60_000,
		defaultTimezone: 'Europe/Rome',
		runPolicy: {
			maxRunsPerTurn: 10,
			maxCatchUpRuns: 5,
			catchUpWindowMs: 24 * 60 * 60_000,
			minIntervalMs: 60_000,
			highFrequencyThresholdMs: 5 * 60_000,
			dstPolicy: 'skipNonexistentTime',
		},
		defaultRetryPolicy: {
			maxAttempts: 2,
			initialDelayMs: 1,
			maxDelayMs: 1,
			backoffMultiplier: 1,
			jitter: false,
			retryableErrorCodes: ['CRON_SCHEDULE_EXECUTION_TRANSIENT'],
			nonRetryableErrorCodes: [],
		},
	});
	return { scheduler, store, runner };
}

function request(overrides: Partial<CronScheduleCreateRequest> = {}): CronScheduleCreateRequest {
	return {
		name: 'Weekly reminder',
		type: 'cron',
		source: 'ui',
		createdBy: 'user-1',
		ownerUserId: 'user-1',
		visibility: 'user',
		timezone: 'Europe/Rome',
		cronExpression: '0 9 * * 1',
		missedRunPolicy: 'skip',
		concurrencyPolicy: 'skipIfRunning',
		taskType: AGENT_TASK_TYPE,
		taskInput: { message: 'Review invoices' },
		...overrides,
	};
}

async function due(
	schedule: CronSchedule,
	store: InMemoryCronScheduleStore,
	when: string
): Promise<CronSchedule> {
	return store.updateSchedule(schedule.id, { nextRunAt: when, status: 'active', enabled: true });
}

describe('CronSchedulerService', () => {
	it('creates and persists a cron schedule with explicit timezone and next run', async () => {
		const { scheduler, store } = makeScheduler();

		const schedule = await scheduler.createSchedule(request(), actor);

		expect(schedule.timezone).toBe('Europe/Rome');
		expect(schedule.nextRunAt).toBeTruthy();
		await expect(store.getSchedule(schedule.id)).resolves.toMatchObject({ id: schedule.id });
	});

	it('rejects invalid cron expressions and sensitive stored inputs', async () => {
		const { scheduler } = makeScheduler();

		await expect(
			scheduler.createSchedule(request({ cronExpression: 'invalid' }), actor)
		).rejects.toThrow(/Cron expression/);
		await expect(
			scheduler.createSchedule(request({ taskInput: { apiKey: 'secret' } }), actor)
		).rejects.toThrow(/Sensitive field/);
		await expect(
			scheduler.createSchedule(request({ taskInput: { model: 'gpt-5.5' } }), actor)
		).rejects.toThrow(/Runtime configuration/);
		await expect(
			scheduler.createSchedule(
				request({ taskInput: { message: 'Review invoices', extra: 'not allowed' } }),
				actor
			)
		).rejects.toThrow(/only supports message/);
	});

	it('computes timezone-aware cron and interval next runs', async () => {
		const { scheduler } = makeScheduler();
		const cronSchedule = await scheduler.createSchedule(
			request({ cronExpression: '30 8 * * 1-5' }),
			actor
		);
		const intervalSchedule = await scheduler.createSchedule(
			request({
				type: 'interval',
				cronExpression: undefined,
				intervalMs: 30 * 60_000,
				taskInput: { message: 'repeat' },
			}),
			actor
		);

		expect((await scheduler.getNextRuns(cronSchedule.id, 2, actor)).runs).toHaveLength(2);
		expect(await scheduler.computeNextRun(intervalSchedule, new Date())).toBeInstanceOf(Date);
	});

	it('creates a task from a due schedule and completes one-time schedules', async () => {
		const { scheduler, store, runner } = makeScheduler();
		const schedule = await scheduler.createSchedule(
			request({
				type: 'oneTime',
				cronExpression: undefined,
				runAt: new Date(Date.now() + 60_000).toISOString(),
			}),
			actor
		);
		const scheduledRunAt = new Date(Date.now() - 1_000).toISOString();
		await due(schedule, store, scheduledRunAt);

		await scheduler.processDueSchedules(new Date());

		expect(runner.tasks).toHaveLength(1);
		await expect(store.getSchedule(schedule.id)).resolves.toMatchObject({
			status: 'completed',
			runCount: 1,
		});
	});

	it('recovers missed runs using skip, runOnce, and catchUp policies', async () => {
		const { scheduler, store, runner } = makeScheduler();
		const missed = new Date(Date.now() - 3 * 60_000).toISOString();
		const skip = await scheduler.createSchedule(
			request({ name: 'skip', missedRunPolicy: 'skip' }),
			actor
		);
		const runOnce = await scheduler.createSchedule(
			request({ name: 'run once', missedRunPolicy: 'runOnce' }),
			actor
		);
		const catchUp = await scheduler.createSchedule(
			request({
				name: 'catch up',
				cronExpression: '* * * * *',
				missedRunPolicy: 'catchUp',
				maxCatchUpRuns: 2,
			}),
			actor
		);
		await due(skip, store, missed);
		await due(runOnce, store, missed);
		await due(catchUp, store, missed);

		await scheduler.recoverSchedulesOnStartup();

		expect(runner.tasks).toHaveLength(3);
		expect((await store.getSchedule(skip.id)).runCount).toBe(0);
		expect((await store.getSchedule(runOnce.id)).runCount).toBe(1);
		expect((await store.getSchedule(catchUp.id)).runCount).toBe(2);
	});

	it('prevents duplicates with idempotency keys and records execution history', async () => {
		const { scheduler, store, runner } = makeScheduler();
		const schedule = await scheduler.createSchedule(request(), actor);
		const scheduledRunAt = new Date(Date.now() - 1_000).toISOString();
		await due(schedule, store, scheduledRunAt);

		await scheduler.processDueSchedules(new Date());
		await store.updateSchedule(schedule.id, { nextRunAt: scheduledRunAt, status: 'active' });
		await scheduler.processDueSchedules(new Date());

		const executions = await store.listExecutions(schedule.id);
		expect(runner.tasks).toHaveLength(1);
		expect(executions).toHaveLength(1);
		expect(executions[0]?.idempotencyKey).toContain(`cron:${schedule.id}:`);
	});

	it('retries transient task creation failures', async () => {
		const runner = new RecordingRunner();
		runner.failuresBeforeSuccess = 1;
		const { scheduler, store } = makeScheduler(runner);
		const schedule = await scheduler.createSchedule(request(), actor);
		await due(schedule, store, new Date(Date.now() - 1_000).toISOString());

		await scheduler.processDueSchedules(new Date());

		expect(runner.tasks).toHaveLength(1);
		expect(runner.createAttempts).toBe(2);
	});

	it('does not retry non-retryable task creation failures', async () => {
		const runner = new RecordingRunner();
		runner.failuresBeforeSuccess = 1;
		runner.failureError = new CronScheduleValidationError('invalid task input');
		const { scheduler, store } = makeScheduler(runner);
		const schedule = await scheduler.createSchedule(request(), actor);
		await due(schedule, store, new Date(Date.now() - 1_000).toISOString());

		await scheduler.processDueSchedules(new Date());

		expect(runner.createAttempts).toBe(1);
		expect(runner.tasks).toHaveLength(0);
		expect((await store.listExecutions(schedule.id))[0]).toMatchObject({
			status: 'taskFailed',
		});
	});

	it('applies skipIfRunning and queueIfRunning concurrency policies', async () => {
		const runner = new RecordingRunner();
		runner.running = [{ id: 'active-task', status: 'running', metadata: {} } as CronScheduledTask];
		const { scheduler, store } = makeScheduler(runner);
		const skip = await scheduler.createSchedule(
			request({ concurrencyPolicy: 'skipIfRunning' }),
			actor
		);
		const queue = await scheduler.createSchedule(
			request({ name: 'queue', concurrencyPolicy: 'queueIfRunning' }),
			actor
		);
		await due(skip, store, new Date(Date.now() - 2_000).toISOString());
		await due(queue, store, new Date(Date.now() - 1_000).toISOString());

		await scheduler.processDueSchedules(new Date());

		expect(runner.tasks).toHaveLength(0);
		expect((await store.listExecutions(skip.id))[0]?.status).toBe('skipped');
		expect(await store.listExecutions(queue.id)).toHaveLength(0);
		const queued = await store.getSchedule(queue.id);
		expect(queued.nextRunAt).toBeTruthy();

		runner.running = [];
		await scheduler.processDueSchedules(new Date());

		expect(runner.tasks).toHaveLength(1);
		expect((await store.listExecutions(queue.id))[0]?.status).toBe('taskCreated');
	});

	it('supports pause, resume, delete, run now, and lock recovery', async () => {
		const { scheduler, store, runner } = makeScheduler();
		const schedule = await scheduler.createSchedule(request(), actor);

		await scheduler.pauseSchedule(schedule.id, actor);
		await expect(store.getSchedule(schedule.id)).resolves.toMatchObject({ status: 'paused' });
		await scheduler.resumeSchedule(schedule.id, actor);
		await expect(store.getSchedule(schedule.id)).resolves.toMatchObject({ status: 'active' });
		await scheduler.runScheduleNow(schedule.id, actor);
		expect(runner.tasks).toHaveLength(1);

		expect(await store.acquireScheduleLock(schedule.id, 'runner-a', -1)).toBe(true);
		expect(await store.acquireScheduleLock(schedule.id, 'runner-b', 60_000)).toBe(true);

		await scheduler.deleteSchedule(schedule.id, actor);
		await expect(store.getSchedule(schedule.id)).resolves.toMatchObject({
			status: 'deleted',
			enabled: false,
		});
	});

	it('requires permissions, owner scope, and confirmation before saving schedules', async () => {
		const { scheduler } = makeScheduler();
		await expect(
			scheduler.createSchedule(request(), { ...actor, permissions: [] })
		).rejects.toThrow(/Missing cron permission: createSchedule/);
		await expect(
			scheduler.createSchedule(request({ ownerUserId: 'user-2' }), actor)
		).rejects.toThrow(/owner does not match/);
		await expect(
			scheduler.createSchedule(request({ requiredPermissions: ['scheduleNetworkAccess'] }), actor)
		).rejects.toThrow(/Missing cron permission: scheduleNetworkAccess/);
		await expect(
			scheduler.createSchedule(request({ requiresConfirmation: true }), actor)
		).rejects.toThrow(/requires confirmation/);
		await expect(
			scheduler.createSchedule(request({ requiresConfirmation: true, confirmed: true }), actor)
		).resolves.toMatchObject({
			taskType: AGENT_TASK_TYPE,
		});
	});

	it('enforces owner scope for schedule reads and mutations', async () => {
		const { scheduler } = makeScheduler();
		const schedule = await scheduler.createSchedule(request(), actor);
		const otherActor: CronActorContext = { ...actor, userId: 'user-2' };

		await expect(scheduler.getSchedule(schedule.id, otherActor)).rejects.toThrow(/owned by another/);
		await expect(scheduler.runScheduleNow(schedule.id, otherActor)).rejects.toThrow(
			/owned by another/
		);
		await expect(scheduler.listSchedules({}, otherActor)).resolves.toEqual([]);
	});

	it('rejects non-agent task types', async () => {
		const { scheduler } = makeScheduler();
		await expect(
			scheduler.createSchedule(
				request({ taskType: 'email.send', requiresConfirmation: true }),
				actor
			)
		).rejects.toThrow(/agent\.run/);
	});

	it('redacts audit/log payloads', () => {
		expect(redactCronValue({ apiKey: 'secret', nested: { token: 'secret', ok: 'yes' } })).toEqual({
			apiKey: '[redacted]',
			nested: { token: '[redacted]', ok: 'yes' },
		});
	});

	it('creates approved agent background tasks through TaskManagerCronScheduleRunner', async () => {
		const eventBus = new EventBus();
		const registry = new TaskRegistry();
		const run = jest.fn(async (context: TaskContext<{ message: string }>) => ({
			text: `done: ${context.input.message}`,
		}));
		registry.register(
			{
				type: AGENT_TASK_TYPE,
				validateInput(input: unknown) {
					return input as { message: string };
				},
				run,
			},
			{ userFacing: true }
		);
		const taskManager = new TaskManager({ registry, eventBus });
		const runner = new TaskManagerCronScheduleRunner(taskManager);
		const { scheduler, store } = makeScheduler(runner);
		const schedule = await scheduler.createSchedule(request(), actor);
		await due(schedule, store, new Date(Date.now() - 1_000).toISOString());

		await scheduler.processDueSchedules(new Date());

		expect(taskManager.list()).toEqual([
			expect.objectContaining({
				type: AGENT_TASK_TYPE,
				title: 'Weekly reminder',
				metadata: expect.objectContaining({
					cronScheduleId: schedule.id,
					cronInput: { message: 'Review invoices' },
				}),
			}),
		]);
	});
});
