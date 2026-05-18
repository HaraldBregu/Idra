import type {
	FridayCronAddRequest,
	FridayCronJobDefinition,
	FridayCronRunRecord,
} from '../../../../src/shared/cron';
import {
	ElectronStoreFridayCronStore,
	emptyFridayCronStoreState,
	AgentServiceFridayCronExecutor,
	FridayCronScheduler,
	type FridayCronStoreState,
	type FridayCronDeliveryPort,
	type FridayCronExecutionOutcome,
	type FridayCronExecutor,
} from '../../../../src/main/cron';
import type { StoreService } from '../../../../src/main/store';

class RecordingExecutor implements FridayCronExecutor {
	calls: Array<{ job: FridayCronJobDefinition; runId: string }> = [];
	outcomes: Array<FridayCronExecutionOutcome | Error> = [];
	onExecute?: () => Promise<void>;

	async execute(input: Parameters<FridayCronExecutor['execute']>[0]): Promise<FridayCronExecutionOutcome> {
		this.calls.push({ job: input.job, runId: input.runId });
		await this.onExecute?.();
		const outcome = this.outcomes.shift();
		if (outcome instanceof Error) throw outcome;
		return outcome ?? { status: 'ok', output: 'done' };
	}
}

class RecordingDelivery implements FridayCronDeliveryPort {
	calls: Parameters<FridayCronDeliveryPort['deliver']>[0][] = [];

	async deliver(input: Parameters<FridayCronDeliveryPort['deliver']>[0]) {
		this.calls.push(input);
		return {
			mode: input.delivery.mode,
			status: 'sent' as const,
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

function createFridayStoreService(): {
	service: StoreService;
	readState: () => FridayCronStoreState;
} {
	let state = emptyFridayCronStoreState();
	return {
		service: {
			getFridayCronState: jest.fn(() => state),
			setFridayCronState: jest.fn((next: FridayCronStoreState) => {
				state = next;
			}),
		} as unknown as StoreService,
		readState: () => state,
	};
}

async function makeHarness(options: { enabled?: boolean } = {}) {
	const storeService = createFridayStoreService();
	const store = new ElectronStoreFridayCronStore(storeService.service);
	const executor = new RecordingExecutor();
	const delivery = new RecordingDelivery();
	const scheduler = new FridayCronScheduler(store, executor, delivery, {
		enabled: options.enabled ?? true,
		maintenanceIntervalMs: 60_000,
		minRefireGapMs: 1,
		defaultBackoffMs: 1_000,
		defaultMaxBackoffMs: 8_000,
		scheduleErrorDisableThreshold: 3,
	});
	return { store, storeService, executor, delivery, scheduler };
}

function agentJob(overrides: Partial<FridayCronAddRequest> = {}): FridayCronAddRequest {
	return {
		id: `job-${Math.random().toString(16).slice(2)}`,
		name: 'Cron agent turn',
		description: 'test',
		schedule: { kind: 'every', everyMs: 60_000 },
		sessionTarget: 'isolated',
		payload: { kind: 'agentTurn', message: 'Summarize inbox' },
		...overrides,
	};
}

function systemJob(overrides: Partial<FridayCronAddRequest> = {}): FridayCronAddRequest {
	return {
		id: `job-${Math.random().toString(16).slice(2)}`,
		name: 'Cron system event',
		schedule: { kind: 'at', at: new Date(Date.now() + 60_000).toISOString() },
		sessionTarget: 'main',
		payload: { kind: 'systemEvent', text: 'Wake up' },
		...overrides,
	};
}

describe('FridayCronScheduler', () => {
	it('keeps CRUD working while globally disabled and does not arm or run timers', async () => {
		const { scheduler, executor, storeService } = await makeHarness({ enabled: false });
		await scheduler.start();
		const job = await scheduler.add(agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() } }));

		await scheduler.wake();

		expect((await scheduler.status()).enabled).toBe(false);
		expect((await scheduler.status()).timerArmed).toBe(false);
		expect(executor.calls).toHaveLength(0);
		expect(storeService.readState().jobs).toEqual([expect.objectContaining({ id: job.id })]);
		await scheduler.stop();
	});

	it('clears and recomputes nextRunAtMs for per-job disable and enable', async () => {
		const { scheduler } = await makeHarness();
		const disabled = await scheduler.add(agentJob({ enabled: false }));

		expect(disabled.state.nextRunAtMs).toBeUndefined();
		const enabled = await scheduler.update(disabled.id, { enabled: true });
		expect(enabled.state.nextRunAtMs).toBeGreaterThan(Date.now());
		const off = await scheduler.update(disabled.id, { enabled: false });
		expect(off.state.nextRunAtMs).toBeUndefined();
		expect(off.state.runningAtMs).toBeUndefined();
	});

	it('validates payload and session target combinations', async () => {
		const { scheduler } = await makeHarness();

		await expect(
			scheduler.add(agentJob({ sessionTarget: 'main' }))
		).rejects.toThrow(/main session/);
		await expect(
			scheduler.add(systemJob({ sessionTarget: 'isolated' }))
		).rejects.toThrow(/require payload.kind = agentTurn/);
		await expect(
			scheduler.add(agentJob({ sessionTarget: 'session:bad/id' }))
		).rejects.toThrow(/path separators/);
	});

	it('marks interrupted startup runs as errors', async () => {
		const { scheduler, store } = await makeHarness();
		const job = await scheduler.add(agentJob());
		const snapshot = await store.load();
		snapshot.states[job.id]!.runningAtMs = Date.now() - 5_000;
		await store.save(snapshot);

		await scheduler.recoverStartup();

		const recovered = await scheduler.get(job.id);
		const runs = await scheduler.runs(job.id);
		expect(recovered.state.lastRunStatus).toBe('error');
		expect(runs[0]?.error?.code).toBe('CRON_INTERRUPTED');
	});

	it('persists runningAtMs before executing a due job', async () => {
		const { scheduler, store, executor } = await makeHarness();
		const job = await scheduler.add(agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() }, deleteAfterRun: false }));
		executor.onExecute = async () => {
			const during = await store.load();
			expect(during.states[job.id]?.runningAtMs).toBeTruthy();
		};

		await scheduler.processDue(Date.now());

		expect(executor.calls).toHaveLength(1);
	});

	it('supports manual force and due modes', async () => {
		const { scheduler, executor } = await makeHarness();
		const job = await scheduler.add(agentJob());

		const due = await scheduler.run(job.id, 'due');
		const forced = await scheduler.run(job.id, 'force');

		expect(due.status).toBe('skipped');
		expect(due.skippedReason).toBe('not_due');
		expect(forced.status).toBe('ok');
		expect(executor.calls).toHaveLength(1);
	});

	it('restricts cron self-cleanup grants to the current job', async () => {
		const { scheduler } = await makeHarness();
		const own = await scheduler.add(agentJob({ id: 'own-job' }));
		const other = await scheduler.add(agentJob({ id: 'other-job' }));
		const self = { role: 'cron-self' as const, jobId: own.id };

		await expect(scheduler.list('all', self)).resolves.toHaveLength(1);
		await expect(scheduler.get(other.id, self)).rejects.toThrow(/restricted to the current cron job/);
		await expect(scheduler.add(agentJob({ id: 'new-job' }), self)).rejects.toThrow(/restricted to the current cron job|owner-only/);
		await expect(scheduler.remove(own.id, self)).resolves.toBeUndefined();
	});

	it('normalizes flat model-friendly tool add requests before storing jobs', async () => {
		const { scheduler } = await makeHarness();

		const response = await scheduler.handleToolAction({
			action: 'add',
			name: 'Hourly report',
			cron: '0 * * * *',
			tz: 'UTC',
			staggerMs: 5000,
			message: 'Send report',
			enabled: 'true',
		});

		expect(response.status).toBe('ok');
		expect(response.result).toMatchObject({
			name: 'Hourly report',
			schedule: { kind: 'cron', expr: '0 * * * *', tz: 'UTC', staggerMs: 5000 },
			payload: { kind: 'agentTurn', message: 'Send report' },
			enabled: true,
			wakeMode: 'now',
			sessionTarget: 'isolated',
			delivery: { mode: 'announce' },
		});
	});

	it('prefers jobId over id and filters tool lists by requester agent id', async () => {
		const { scheduler } = await makeHarness();
		const own = await scheduler.add(agentJob({ id: 'own-job', agentId: 'agent-1' }));
		await scheduler.add(agentJob({ id: 'other-job', agentId: 'agent-2' }));

		const listed = await scheduler.handleToolAction(
			{ action: 'list' },
			{ role: 'owner', agentId: 'agent-1' }
		);
		const fetched = await scheduler.handleToolAction({ action: 'get', jobId: own.id, id: 'other-job' });

		expect(listed.result).toEqual([expect.objectContaining({ id: own.id })]);
		expect(fetched.result).toMatchObject({ id: own.id });
	});

	it('suppresses fallback delivery when the agent already delivered', async () => {
		const { scheduler, executor, delivery } = await makeHarness();
		executor.outcomes.push({ status: 'ok', output: 'sent already', alreadyDelivered: true });
		const job = await scheduler.add(agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() }, deleteAfterRun: false }));

		await scheduler.processDue(Date.now());

		const runs = await scheduler.runs(job.id);
		expect(delivery.calls).toHaveLength(0);
		expect(runs[0]?.delivery?.duplicateSuppressed).toBe(true);
	});

	it('deletes successful one-shot jobs by default while preserving run logs', async () => {
		const { scheduler } = await makeHarness();
		const job = await scheduler.add(agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() } }));

		await scheduler.processDue(Date.now());

		await expect(scheduler.get(job.id)).rejects.toThrow();
		expect(await scheduler.runs(job.id)).toHaveLength(1);
	});

	it('retries transient one-shot errors and disables permanent one-shot errors', async () => {
		const { scheduler, executor, store } = await makeHarness();
		executor.outcomes.push(new Error('temporary'));
		const job = await scheduler.add(agentJob({
			schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() },
			deleteAfterRun: false,
			maxAttempts: 2,
		}));

		await scheduler.processDue(Date.now());
		expect((await scheduler.get(job.id)).enabled).toBe(true);
		expect((await scheduler.get(job.id)).state.nextRunAtMs).toBeGreaterThan(Date.now());

		const snapshot = await store.load();
		snapshot.states[job.id]!.nextRunAtMs = Date.now() - 1;
		await store.save(snapshot);
		const permanent = new Error('permanent') as Error & { permanent: boolean };
		permanent.permanent = true;
		executor.outcomes.push(permanent);
		await scheduler.processDue(Date.now());

		expect((await scheduler.get(job.id)).enabled).toBe(false);
	});

	it('backs off recurring jobs after errors', async () => {
		const { scheduler, executor } = await makeHarness();
		executor.outcomes.push(new Error('boom'));
		const job = await scheduler.add(agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() }, deleteAfterRun: false }));

		await scheduler.update(job.id, { schedule: { kind: 'every', everyMs: 10_000 } });
		const snapshotJob = await scheduler.get(job.id);
		await scheduler.processDue(snapshotJob.state.nextRunAtMs ?? Date.now());

		const failed = await scheduler.get(job.id);
		expect(failed.state.lastRunStatus).toBe('error');
		expect(failed.state.nextRunAtMs).toBeGreaterThan(Date.now());
	});

	it('auto-disables jobs after repeated schedule computation errors', async () => {
		const { scheduler, store } = await makeHarness();
		const now = Date.now();
		const badJob: FridayCronJobDefinition = {
			id: 'bad-cron',
			name: 'Bad cron',
			description: '',
			enabled: true,
			createdAtMs: now,
			updatedAtMs: now,
			schedule: { kind: 'cron', expr: 'not cron' },
			sessionTarget: 'isolated',
			wakeMode: 'now',
			payload: { kind: 'agentTurn', message: 'run' },
			delivery: { mode: 'none' },
		};
		await store.save({ jobs: [badJob], states: { [badJob.id]: { consecutiveErrors: 0, consecutiveSkipped: 0, consecutiveScheduleErrors: 0, attempts: 0 } } });

		await scheduler.processDue(now);
		await scheduler.processDue(now + 1);
		await scheduler.processDue(now + 2);

		const disabled = await scheduler.get(badJob.id);
		expect(disabled.enabled).toBe(false);
		expect(disabled.state.consecutiveScheduleErrors).toBe(3);
	});

	it('appends and reads run logs', async () => {
		const { store } = await makeHarness();
		const run: FridayCronRunRecord = {
			runId: 'run-1',
			jobId: 'log-job',
			status: 'ok',
			mode: 'manual-force',
			scheduledForMs: 1,
			startedAtMs: 1,
			finishedAtMs: 2,
			attempt: 1,
		};

		await store.appendRun(run);

		await expect(store.listRuns('log-job')).resolves.toEqual([run]);
	});

	it('denies cron to non-owner callers', async () => {
		const { scheduler } = await makeHarness();
		await expect(scheduler.handleToolAction({ action: 'status' }, { role: 'subagent' })).resolves.toMatchObject({
			status: 'error',
		});
	});
});

describe('AgentServiceFridayCronExecutor', () => {
	function executableJob(overrides: Partial<FridayCronJobDefinition> = {}): FridayCronJobDefinition {
		return {
			id: 'job-1',
			name: 'Cron agent turn',
			description: '',
			enabled: true,
			createdAtMs: 1,
			updatedAtMs: 1,
			schedule: { kind: 'every', everyMs: 60_000 },
			sessionTarget: 'isolated',
			wakeMode: 'now',
			payload: { kind: 'agentTurn', message: 'Summarize inbox' },
			delivery: { mode: 'none' },
			agentId: 'main',
			...overrides,
		};
	}

	function runInput(job: FridayCronJobDefinition): Parameters<FridayCronExecutor['execute']>[0] {
		return {
			job,
			runId: 'run-1',
			scheduledForMs: 1,
			signal: new AbortController().signal,
		};
	}

	it('uses one stable isolated session per cron job instead of the main session', async () => {
		const send = jest.fn(async () => 'agent output');
		const executor = new AgentServiceFridayCronExecutor({ send } as never);

		await executor.execute(runInput(executableJob({ id: 'job-a' })));
		await executor.execute(runInput(executableJob({ id: 'job-b' })));

		expect(send).toHaveBeenNthCalledWith(
			1,
			'Summarize inbox',
			'main',
			expect.objectContaining({
				sessionId: 'cron:job-a',
				cronContext: expect.objectContaining({
					role: 'cron-self',
					jobId: 'job-a',
					agentId: 'main',
				}),
			})
		);
		expect(send).toHaveBeenNthCalledWith(
			2,
			'Summarize inbox',
			'main',
			expect.objectContaining({ sessionId: 'cron:job-b' })
		);
	});

	it('honors explicit and main session targets', async () => {
		const send = jest.fn(async () => 'agent output');
		const executor = new AgentServiceFridayCronExecutor({ send } as never);

		await executor.execute(runInput(executableJob({
			id: 'session-job',
			sessionTarget: 'session:custom-session',
		})));
		await executor.execute(runInput(executableJob({
			id: 'main-job',
			sessionTarget: 'main',
			payload: { kind: 'systemEvent', text: 'Wake up' },
		})));

		expect(send).toHaveBeenNthCalledWith(
			1,
			'Summarize inbox',
			'main',
			expect.objectContaining({ sessionId: 'custom-session' })
		);
		expect(send).toHaveBeenNthCalledWith(
			2,
			'Wake up',
			'main',
			expect.objectContaining({ sessionId: 'main' })
		);
	});

	it('hands main-session system events to heartbeat when available', async () => {
		const send = jest.fn(async () => 'agent output');
		const heartbeat = { systemEvent: jest.fn(async () => ({ queued: true, sessionKey: 'main', mode: 'now' })) };
		const executor = new AgentServiceFridayCronExecutor({ send } as never, heartbeat as never);

		await expect(executor.execute(runInput(executableJob({
			id: 'main-reminder',
			sessionTarget: 'main',
			wakeMode: 'now',
			payload: { kind: 'systemEvent', text: 'Review the draft' },
			delivery: { mode: 'announce', channel: 'telegram', to: '123' },
		})))).resolves.toEqual({ status: 'ok', output: '', alreadyDelivered: true });

		expect(send).not.toHaveBeenCalled();
		expect(heartbeat.systemEvent).toHaveBeenCalledWith({
			text: 'Review the draft',
			agentId: 'main',
			sessionKey: 'main',
			mode: 'now',
			heartbeat: { target: 'telegram', to: '123', accountId: undefined },
		});
	});
});
