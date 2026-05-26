import type {
	FridayCronAddRequest,
	FridayCronJobDefinition,
	FridayCronRunRecord,
} from '../../../../src/shared/cron';
import {
	ElectronStoreFridayCronStore,
	emptyFridayCronStoreState,
	type FridayCronStoreState,
} from '../../../../src/main/cron/workflow/store';
import {
	AgentServiceFridayCronExecutor,
	GatewayFridayCronDelivery,
	TaskManagerFridayCronExecutor,
} from '../../../../src/main/cron/workflow/runtime-adapters';
import {
	FridayCronScheduler,
	type FridayCronDeliveryPort,
	type FridayCronExecutionOutcome,
	type FridayCronExecutor,
} from '../../../../src/main/cron/workflow/scheduler';
import { EventBus } from '../../../../src/main/core';
import { AGENT_TASK_TYPE, TaskManager, type TaskPersistencePort } from '../../../../src/main/tasks';
import type { TaskStoreState } from '../../../../src/shared/tasks';

class RecordingExecutor implements FridayCronExecutor {
	calls: Array<{ job: FridayCronJobDefinition; runId: string }> = [];
	outcomes: Array<FridayCronExecutionOutcome | Error> = [];
	onExecute?: () => Promise<void>;

	async execute(
		input: Parameters<FridayCronExecutor['execute']>[0]
	): Promise<FridayCronExecutionOutcome> {
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

function createTaskPersistence(): TaskPersistencePort {
	let state: TaskStoreState = {
		schemaVersion: 1,
		records: [],
		updatedAt: new Date(0).toISOString(),
	};
	return {
		load: jest.fn(() => state),
		save: jest.fn((next: TaskStoreState) => {
			state = next;
		}),
	};
}

function createTaskManager(eventBus: EventBus) {
	const manager = new TaskManager({
		store: {
			getAgentService: jest.fn(() => ({
				provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
				model: { id: 'gpt-5', name: 'GPT-5' },
			})),
			getTaskSettings: jest.fn(() => ({})),
		},
		eventBus,
		persistence: createTaskPersistence(),
	});
	return manager;
}

function createFridayStoreService(): {
	service: {
		getFridayCronState: () => FridayCronStoreState;
		setFridayCronState: (state: FridayCronStoreState) => void;
	};
	readState: () => FridayCronStoreState;
} {
	let state = emptyFridayCronStoreState();
	return {
		service: {
			getFridayCronState: jest.fn(() => state),
			setFridayCronState: jest.fn((next: FridayCronStoreState) => {
				state = next;
			}),
		},
		readState: () => state,
	};
}

async function makeHarness(options: { enabled?: boolean; maxConcurrentRuns?: number } = {}) {
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
		maxConcurrentRuns: options.maxConcurrentRuns ?? 1,
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
		const job = await scheduler.add(
			agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() } })
		);

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

		await expect(scheduler.add(agentJob({ sessionTarget: 'main' }))).rejects.toThrow(
			/main session/
		);
		await expect(scheduler.add(systemJob({ sessionTarget: 'isolated' }))).rejects.toThrow(
			/require payload.kind = agentTurn/
		);
		await expect(scheduler.add(agentJob({ sessionTarget: 'session:bad/id' }))).rejects.toThrow(
			/path separators/
		);
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
		const job = await scheduler.add(
			agentJob({
				schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() },
				deleteAfterRun: false,
			})
		);
		executor.onExecute = async () => {
			const during = await store.load();
			expect(during.states[job.id]?.runningAtMs).toBeTruthy();
		};

		await scheduler.processDue(Date.now());

		expect(executor.calls).toHaveLength(1);
	});

	it('does not start another due job when global concurrency is saturated', async () => {
		const { scheduler, executor } = await makeHarness({ maxConcurrentRuns: 1 });
		const now = Date.now();
		await scheduler.add(
			agentJob({
				id: 'first-due',
				schedule: { kind: 'at', at: new Date(now - 2_000).toISOString() },
				deleteAfterRun: false,
			})
		);
		await scheduler.add(
			agentJob({
				id: 'second-due',
				schedule: { kind: 'at', at: new Date(now - 1_000).toISOString() },
				deleteAfterRun: false,
			})
		);
		let checkedDuringRun = false;
		executor.onExecute = async () => {
			if (checkedDuringRun) return;
			checkedDuringRun = true;
			await scheduler.processDue(now);
		};

		await scheduler.processDue(now);
		expect(executor.calls.map((call) => call.job.id)).toEqual(['first-due']);

		await scheduler.processDue(now + 1);
		expect(executor.calls.map((call) => call.job.id)).toEqual(['first-due', 'second-due']);
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

	it('keeps maintenance ticks armed until future agent jobs are due', async () => {
		jest.useFakeTimers();
		let scheduler: FridayCronScheduler | undefined;
		try {
			const now = Date.UTC(2026, 0, 1, 12, 0, 0);
			jest.setSystemTime(now);
			const harness = await makeHarness();
			scheduler = harness.scheduler;
			await scheduler.add(
				agentJob({
					id: 'future-agent',
					schedule: { kind: 'every', everyMs: 5 * 60_000, anchorMs: now },
				})
			);
			await scheduler.start();

			await jest.advanceTimersByTimeAsync(60_000);
			expect(harness.executor.calls).toHaveLength(0);
			expect((await scheduler.status()).timerArmed).toBe(true);

			await jest.advanceTimersByTimeAsync(4 * 60_000);

			expect(harness.executor.calls.map((call) => call.job.id)).toEqual(['future-agent']);
		} finally {
			await scheduler?.stop();
			jest.useRealTimers();
		}
	});

	it('restricts cron self-cleanup grants to the current job', async () => {
		const { scheduler } = await makeHarness();
		const own = await scheduler.add(agentJob({ id: 'own-job' }));
		const other = await scheduler.add(agentJob({ id: 'other-job' }));
		const self = { role: 'cron-self' as const, jobId: own.id };

		await expect(scheduler.list('all', self)).resolves.toHaveLength(1);
		await expect(scheduler.get(other.id, self)).rejects.toThrow(
			/restricted to the current cron job/
		);
		await expect(scheduler.add(agentJob({ id: 'new-job' }), self)).rejects.toThrow(
			/restricted to the current cron job|owner-only/
		);
		await expect(scheduler.remove(own.id, self)).resolves.toBeUndefined();
	});

	it('normalizes flat add requests without storing provider or model choices', async () => {
		const { scheduler } = await makeHarness();

		const response = await scheduler.handleAction({
			action: 'add',
			name: 'Hourly report',
			cron: '0 * * * *',
			tz: 'UTC',
			staggerMs: 5000,
			message: 'Send report',
			providerId: 'anthropic',
			model: 'claude-test',
			enabled: 'true',
		});

		expect(response.status).toBe('ok');
		expect(response.result).toMatchObject({
			name: 'Hourly report',
			schedule: { kind: 'cron', expr: '0 * * * *', tz: 'UTC', staggerMs: 5000 },
			payload: {
				kind: 'agentTurn',
				message: 'Send report',
			},
			enabled: true,
			wakeMode: 'now',
			sessionTarget: 'isolated',
			delivery: { mode: 'announce' },
		});
		expect(response.result).toEqual(
			expect.objectContaining({
				payload: expect.not.objectContaining({
					providerId: expect.anything(),
					model: expect.anything(),
				}),
			})
		);
	});

	it('normalizes nested agent payloads without requiring an explicit kind', async () => {
		const { scheduler } = await makeHarness();

		const response = await scheduler.handleAction({
			action: 'add',
			job: {
				name: 'Email summary task',
				schedule: { cron: '* * * * *', tz: 'Europe/Rome' },
				sessionTarget: 'isolated',
				payload: {
					message: 'Check latest emails',
					lightContext: true,
					thinking: 'low',
				},
			},
		});

		expect(response.status).toBe('ok');
		expect(response.result).toMatchObject({
			name: 'Email summary task',
			schedule: { kind: 'cron', expr: '* * * * *', tz: 'Europe/Rome' },
			payload: {
				kind: 'agentTurn',
				message: 'Check latest emails',
				lightContext: true,
				thinking: 'low',
			},
		});
	});

	it('prefers jobId over id and filters tool lists by requester agent id', async () => {
		const { scheduler } = await makeHarness();
		const own = await scheduler.add(agentJob({ id: 'own-job', agentId: 'agent-1' }));
		await scheduler.add(agentJob({ id: 'other-job', agentId: 'agent-2' }));

		const listed = await scheduler.handleAction(
			{ action: 'list' },
			{ role: 'owner', agentId: 'agent-1' }
		);
		const fetched = await scheduler.handleAction({
			action: 'get',
			jobId: own.id,
			id: 'other-job',
		});

		expect(listed.result).toEqual([expect.objectContaining({ id: own.id })]);
		expect(fetched.result).toMatchObject({ id: own.id });
	});

	it('suppresses fallback delivery when the agent already delivered', async () => {
		const { scheduler, executor, delivery } = await makeHarness();
		executor.outcomes.push({ status: 'ok', output: 'sent already', alreadyDelivered: true });
		const job = await scheduler.add(
			agentJob({
				schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() },
				deleteAfterRun: false,
			})
		);

		await scheduler.processDue(Date.now());

		const runs = await scheduler.runs(job.id);
		expect(delivery.calls).toHaveLength(0);
		expect(runs[0]?.delivery?.duplicateSuppressed).toBe(true);
	});

	it('deletes successful one-shot jobs by default while preserving run logs', async () => {
		const { scheduler } = await makeHarness();
		const job = await scheduler.add(
			agentJob({ schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() } })
		);

		await scheduler.processDue(Date.now());

		await expect(scheduler.get(job.id)).rejects.toThrow();
		expect(await scheduler.runs(job.id)).toHaveLength(1);
	});

	it('retries transient one-shot errors and disables permanent one-shot errors', async () => {
		const { scheduler, executor, store } = await makeHarness();
		executor.outcomes.push(new Error('temporary'));
		const job = await scheduler.add(
			agentJob({
				schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() },
				deleteAfterRun: false,
				maxAttempts: 2,
			})
		);

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
		const job = await scheduler.add(
			agentJob({
				schedule: { kind: 'at', at: new Date(Date.now() - 1_000).toISOString() },
				deleteAfterRun: false,
			})
		);

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
		await store.save({
			jobs: [badJob],
			states: {
				[badJob.id]: {
					consecutiveErrors: 0,
					consecutiveSkipped: 0,
					consecutiveScheduleErrors: 0,
					attempts: 0,
				},
			},
		});

		await scheduler.processDue(now);
		await scheduler.processDue(now + 1);
		await scheduler.processDue(now + 2);

		const disabled = await scheduler.get(badJob.id);
		expect(disabled.enabled).toBe(false);
		expect(disabled.state.consecutiveScheduleErrors).toBe(3);
	});

	it('keeps only the latest run record', async () => {
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
		const latest: FridayCronRunRecord = {
			...run,
			runId: 'run-2',
			finishedAtMs: 3,
		};

		await store.appendRun(run);
		await store.appendRun(latest);

		await expect(store.listRuns('log-job')).resolves.toEqual([latest]);
	});

	it('denies cron to non-owner callers', async () => {
		const { scheduler } = await makeHarness();
		await expect(
			scheduler.handleAction({ action: 'list' }, { role: 'subagent' })
		).resolves.toMatchObject({
			status: 'error',
		});
	});
});

describe('GatewayFridayCronDelivery', () => {
	it('fails webhook delivery when fetch does not finish before the timeout', async () => {
		jest.useFakeTimers();
		const fetchMock = jest.fn(
			(_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
				new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				})
		) as jest.MockedFunction<typeof fetch>;
		const delivery = new GatewayFridayCronDelivery({
			fetch: fetchMock,
			webhookTimeoutMs: 5,
		});
		const job: FridayCronJobDefinition = {
			id: 'webhook-job',
			name: 'Webhook job',
			description: '',
			enabled: true,
			createdAtMs: 1,
			updatedAtMs: 1,
			schedule: { kind: 'every', everyMs: 60_000 },
			sessionTarget: 'isolated',
			wakeMode: 'now',
			payload: { kind: 'agentTurn', message: 'Run' },
			delivery: { mode: 'webhook', to: 'https://example.com/hook' },
		};

		try {
			const result = delivery.deliver({
				job,
				run: { runId: 'run-1', status: 'ok' },
				output: 'done',
				delivery: job.delivery,
				failure: false,
			});
			jest.advanceTimersByTime(5);

			await expect(result).resolves.toMatchObject({
				mode: 'webhook',
				status: 'failed',
				error: 'Webhook request timed out.',
			});
		} finally {
			jest.useRealTimers();
		}
	});
});

describe('AgentServiceFridayCronExecutor', () => {
	function executableJob(
		overrides: Partial<FridayCronJobDefinition> = {}
	): FridayCronJobDefinition {
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

		await executor.execute(
			runInput(
				executableJob({
					id: 'session-job',
					sessionTarget: 'session:custom-session',
				})
			)
		);
		await executor.execute(
			runInput(
				executableJob({
					id: 'main-job',
					sessionTarget: 'main',
					payload: { kind: 'systemEvent', text: 'Wake up' },
				})
			)
		);

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

	it('passes safe agent-turn runtime options into AgentService.send', async () => {
		const send = jest.fn(async () => 'agent output');
		const executor = new AgentServiceFridayCronExecutor({ send } as never);

		await executor.execute(
			runInput(
				executableJob({
					payload: {
						kind: 'agentTurn',
						message: 'Summarize inbox',
						lightContext: true,
						thinking: 'low',
					},
				})
			)
		);

		expect(send).toHaveBeenCalledWith(
			'Summarize inbox',
			'main',
			expect.objectContaining({
				effort: 'low',
				lightContext: true,
			})
		);
	});

	it('hands main-session system events to heartbeat when available', async () => {
		const send = jest.fn(async () => 'agent output');
		const heartbeat = {
			systemEvent: jest.fn(async () => ({ queued: true, sessionKey: 'main', mode: 'now' })),
		};
		const executor = new AgentServiceFridayCronExecutor({ send } as never, heartbeat as never);

		await expect(
			executor.execute(
				runInput(
					executableJob({
						id: 'main-reminder',
						sessionTarget: 'main',
						wakeMode: 'now',
						payload: { kind: 'systemEvent', text: 'Review the draft' },
						delivery: { mode: 'announce', channel: 'telegram', to: '123' },
					})
				)
			)
		).resolves.toEqual({ status: 'ok', output: '', alreadyDelivered: true });

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

describe('TaskManagerFridayCronExecutor', () => {
	function executableTaskJob(
		overrides: Partial<FridayCronJobDefinition> = {}
	): FridayCronJobDefinition {
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

	function taskRunInput(
		job: FridayCronJobDefinition
	): Parameters<FridayCronExecutor['execute']>[0] {
		return {
			job,
			runId: 'run-1',
			scheduledForMs: 1,
			signal: new AbortController().signal,
		};
	}

	it('creates a visible background agent task and returns its result', async () => {
		const eventBus = new EventBus();
		const send = jest.fn(async (message: string) => `done: ${message}`);
		const taskManager = createTaskManager(eventBus);
		taskManager.configureAgentRuntime({ send, cancel: jest.fn() });
		const fallback = { execute: jest.fn() };
		const executor = new TaskManagerFridayCronExecutor(taskManager, eventBus, fallback as never);

		const outcome = await executor.execute(taskRunInput(executableTaskJob()));

		expect(outcome).toEqual({ status: 'ok', output: 'done: Summarize inbox' });
		expect(fallback.execute).not.toHaveBeenCalled();
		expect(taskManager.list()).toEqual([
			expect.objectContaining({
				type: AGENT_TASK_TYPE,
				title: 'Cron agent turn',
				status: 'succeeded',
				metadata: expect.objectContaining({
					cronJobId: 'job-1',
					cronAgentId: 'main',
				}),
			}),
		]);
		expect(send).toHaveBeenCalledWith(
			'Summarize inbox',
			'main',
			expect.objectContaining({
				providerId: 'openai',
				model: 'gpt-5',
			})
		);
	});

	it('falls back for main-session system events', async () => {
		const eventBus = new EventBus();
		const taskManager = createTaskManager(eventBus);
		taskManager.configureAgentRuntime({
			send: jest.fn(async () => 'unused'),
			cancel: jest.fn(),
		});
		const fallback = { execute: jest.fn(async () => ({ status: 'ok' as const, output: '' })) };
		const executor = new TaskManagerFridayCronExecutor(taskManager, eventBus, fallback);
		const job = executableTaskJob({
			sessionTarget: 'main',
			payload: { kind: 'systemEvent', text: 'Wake up' },
		});

		await expect(executor.execute(taskRunInput(job))).resolves.toEqual({
			status: 'ok',
			output: '',
		});

		expect(fallback.execute).toHaveBeenCalled();
		expect(taskManager.list()).toEqual([]);
	});
});
