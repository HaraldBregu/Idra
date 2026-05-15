import {
	InMemoryTaskStore,
	PriorityQueue,
	TaskDefinitionRegistry,
	TaskManagerService,
	TaskPermissionError,
	TaskTimeoutError,
	WorkerTaskRunner,
	type TaskDefinition,
	type TaskExecutionContext,
	type TaskExecutionResult,
} from '../../../../src/main/task-manager';
import type { TaskEvent, TaskPermissionLevel } from '../../../../src/shared/task';

const objectSchema = {
	type: 'object' as const,
	additionalProperties: true,
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			'abort',
			() => {
				clearTimeout(timer);
				reject(signal.reason ?? new Error('aborted'));
			},
			{ once: true }
		);
	});
}

function definition(
	taskType: string,
	execute: (input: Record<string, unknown>, context: TaskExecutionContext) => Promise<TaskExecutionResult> = async () => ({
		status: 'success',
		output: { ok: true },
	}),
	overrides: Partial<TaskDefinition<Record<string, unknown>, unknown>> = {}
): TaskDefinition<Record<string, unknown>, unknown> {
	return {
		taskType,
		displayName: taskType,
		description: `${taskType} description`,
		inputSchema: overrides.inputSchema ?? objectSchema,
		outputSchema: overrides.outputSchema ?? objectSchema,
		defaultPriority: overrides.defaultPriority ?? 'normal',
		defaultTimeoutMs: overrides.defaultTimeoutMs,
		defaultRetryPolicy: overrides.defaultRetryPolicy ?? {
			maxAttempts: 1,
			initialDelayMs: 0,
			maxDelayMs: 0,
			backoffMultiplier: 1,
			jitter: false,
			retryableErrorCodes: ['TRANSIENT', 'TIMEOUT'],
			nonRetryableErrorCodes: ['VALIDATION_FAILED', 'PERMISSION_DENIED', 'PERMANENT'],
		},
		requiredPermissions: overrides.requiredPermissions ?? [],
		supportsCancellation: overrides.supportsCancellation ?? true,
		supportsPause: overrides.supportsPause ?? false,
		supportsResume: overrides.supportsResume ?? false,
		supportsProgress: overrides.supportsProgress ?? true,
		supportsRecovery: overrides.supportsRecovery ?? true,
		requiresConfirmation: overrides.requiresConfirmation,
		executor: { execute },
		metadata: overrides.metadata ?? {},
	};
}

function setup(definitions: TaskDefinition[], options: Partial<ConstructorParameters<typeof TaskManagerService>[0]> = {}) {
	const store = new InMemoryTaskStore();
	const registry = new TaskDefinitionRegistry();
	for (const taskDefinition of definitions) registry.registerTaskDefinition(taskDefinition);
	const manager = new TaskManagerService({
		store,
		registry,
		concurrency: { global: 2, perTaskType: { slow: 1 }, perSource: { api: 10 }, perUser: 2 },
		...options,
	});
	return { manager, store, registry };
}

async function waitForTerminal(manager: TaskManagerService, taskId: string) {
	const current = await manager.getTask(taskId);
	if (['completed', 'failed', 'cancelled', 'timedOut', 'skipped'].includes(current.status)) return;
	return new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(async () => {
			clearInterval(poll);
			unsubscribe();
			const task = await manager.getTask(taskId);
			reject(new Error(`Timed out waiting for ${task.title} (${taskId}): ${task.status}`));
		}, 1000);
		const poll = setInterval(async () => {
			const task = await manager.getTask(taskId);
			if (['completed', 'failed', 'cancelled', 'timedOut', 'skipped'].includes(task.status)) {
				clearTimeout(timeout);
				clearInterval(poll);
				unsubscribe();
				resolve();
			}
		}, 5);
		const unsubscribe = manager.subscribeToTask(taskId, (event) => {
			if (['task.completed', 'task.failed', 'task.cancelled', 'task.timedOut'].includes(event.type)) {
				clearTimeout(timeout);
				clearInterval(poll);
				unsubscribe();
				resolve();
			}
		});
	});
}

describe('task manager', () => {
	it('creates and executes a task with structured output and events', async () => {
		const { manager } = setup([definition('example')]);
		const events: TaskEvent[] = [];
		const task = await manager.createTask({ type: 'example', source: 'ui', input: {} });
		manager.subscribeToTask(task.id, (event) => events.push(event));
		await manager.enqueueTask(task.id);

		await waitForTerminal(manager, task.id);
		const completed = await manager.getTask(task.id);

		expect(completed.status).toBe('completed');
		expect(completed.output).toEqual({ ok: true });
		expect((await manager.getTaskEvents(task.id)).map((event) => event.type)).toContain('task.completed');
		expect(events.some((event) => event.type === 'task.completed')).toBe(true);
	});

	it('orders queued work by priority and honors per-type concurrency limits', async () => {
		const priorityQueue = new PriorityQueue();
		const baseTask = {
			id: 'low',
			priority: 'low',
			createdAt: '2026-01-01T00:00:00.000Z',
		} as Parameters<PriorityQueue['enqueue']>[0];
		priorityQueue.enqueue(baseTask);
		priorityQueue.enqueue({ ...baseTask, id: 'critical', priority: 'critical' });
		expect(priorityQueue.dequeue(() => true)).toBe('critical');

		const started: string[] = [];
		let release!: () => void;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const { manager } = setup([
			definition('slow', async (input, context) => {
				started.push(String(input.name));
				await gate;
				await context.updateProgress({ percentage: 100 });
				return { status: 'success', output: { ok: true } };
			}),
		]);

		const low = await manager.createTask({ type: 'slow', source: 'ui', input: { name: 'low' }, priority: 'low' });
		const critical = await manager.createTask({ type: 'slow', source: 'ui', input: { name: 'critical' }, priority: 'critical' });
		const second = await manager.createTask({ type: 'slow', source: 'ui', input: { name: 'second' }, priority: 'normal' });
		await manager.enqueueTask(critical.id);
		await manager.enqueueTask(low.id);
		await manager.enqueueTask(second.id);
		await delay(10);

		expect(started).toHaveLength(1);
		release();
		await waitForTerminal(manager, critical.id);
		await waitForTerminal(manager, low.id);
		await waitForTerminal(manager, second.id);
		expect(started).toHaveLength(3);
	});

	it('waits for dependencies and fails dependents when required dependency fails', async () => {
		const { manager } = setup([
			definition('fail', async () => ({ status: 'failure', error: { code: 'PERMANENT', message: 'no', retryable: false, safeUserMessage: 'no' } })),
			definition('child'),
		]);
		const parent = await manager.createTask({ type: 'fail', source: 'system', input: {}, autoStart: true });
		const child = await manager.createTask({
			type: 'child',
			source: 'system',
			input: {},
			dependencies: [{ taskId: parent.id, type: 'succeedsBefore', onFailure: 'fail' }],
			autoStart: true,
		});

		expect((await manager.getTask(child.id)).status).toBe('waitingForDependency');
		await waitForTerminal(manager, parent.id);
		await waitForTerminal(manager, child.id);
		expect((await manager.getTask(child.id)).status).toBe('failed');
	});

	it('supports cancellation, timeout, retry, and non-retryable failure behavior', async () => {
		let retryCalls = 0;
		const { manager } = setup([
			definition('cancel', async (_input, context) => {
				await delay(1_000, context.signal);
				return { status: 'success', output: { ok: true } };
			}),
			definition('timeout', async () => {
				await delay(50);
				return { status: 'success', output: { ok: true } };
			}, { defaultTimeoutMs: 5, defaultRetryPolicy: { maxAttempts: 1, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1, jitter: false, retryableErrorCodes: ['TIMEOUT'], nonRetryableErrorCodes: [] } }),
			definition('retry', async () => {
				retryCalls++;
				if (retryCalls === 1) {
					return { status: 'failure', error: { code: 'TRANSIENT', message: 'again', retryable: true, safeUserMessage: 'again' } };
				}
				return { status: 'success', output: { ok: true } };
			}, { defaultRetryPolicy: { maxAttempts: 2, initialDelayMs: 0, maxDelayMs: 0, backoffMultiplier: 1, jitter: false, retryableErrorCodes: ['TRANSIENT'], nonRetryableErrorCodes: [] } }),
			definition('permanent', async () => ({ status: 'failure', error: { code: 'PERMANENT', message: 'stop', retryable: true, safeUserMessage: 'stop' } })),
		]);

		const cancellable = await manager.createTask({ type: 'cancel', source: 'ui', input: {}, autoStart: true });
		await delay(5);
		await manager.cancelTask(cancellable.id, 'user_cancelled');
		await waitForTerminal(manager, cancellable.id);
		expect((await manager.getTask(cancellable.id)).status).toBe('cancelled');

		const timedOut = await manager.createTask({ type: 'timeout', source: 'system', input: {}, autoStart: true });
		await waitForTerminal(manager, timedOut.id);
		expect((await manager.getTask(timedOut.id)).status).toBe('timedOut');

		const retried = await manager.createTask({ type: 'retry', source: 'system', input: {}, autoStart: true });
		await waitForTerminal(manager, retried.id);
		expect((await manager.getTask(retried.id)).status).toBe('completed');
		expect(retryCalls).toBe(2);

		const permanent = await manager.createTask({ type: 'permanent', source: 'system', input: {}, autoStart: true });
		await waitForTerminal(manager, permanent.id);
		expect((await manager.getTask(permanent.id)).attemptCount).toBe(1);
	});

	it('tracks parent-child tasks, workflow progress, scheduled execution, and recovery', async () => {
		const { manager, store } = setup([definition('example')]);
		const workflow = await manager.createWorkflow({ title: 'workflow' });
		const parent = await manager.createTask({ type: 'example', title: 'parent', source: 'agent', workflowId: workflow.workflowId, input: {}, autoStart: true });
		const child = await manager.createTask({ type: 'example', title: 'child', source: 'skill', parentTaskId: parent.id, workflowId: workflow.workflowId, input: {}, autoStart: true });
		await delay(20);
		await waitForTerminal(manager, parent.id);
		await waitForTerminal(manager, child.id);

		expect((await manager.getTask(parent.id)).childTaskIds).toEqual([child.id]);
		expect((await manager.getWorkflow(workflow.workflowId)).progress.percentage).toBe(100);

		const scheduled = await manager.scheduleTask({
			type: 'example',
			title: 'scheduled',
			source: 'cron',
			input: {},
			schedulePolicy: { runAt: new Date(Date.now() - 1).toISOString() },
		});
		await manager.recoverIncompleteTasks();
		await waitForTerminal(manager, scheduled.id);
		expect((await store.getTask(scheduled.id)).status).toBe('completed');
	});

	it('denies missing permissions and holds confirmation-required tasks', async () => {
		const { manager } = setup([
			definition('private', undefined, { requiredPermissions: ['readPrivateData' as TaskPermissionLevel] }),
			definition('delete', undefined, { requiredPermissions: ['deleteData'], requiresConfirmation: true }),
		]);

		await expect(manager.createTask({ type: 'private', source: 'ui', input: {} })).rejects.toBeInstanceOf(TaskPermissionError);
		const task = await manager.createTask({
			type: 'delete',
			source: 'ui',
			input: {},
			availablePermissions: ['deleteData'],
		});
		expect((await manager.getTask(task.id)).status).toBe('waitingForConfirmation');
	});

	it('redacts audit data and reports worker task failures cleanly', async () => {
		const { manager } = setup([definition('secret')]);
		const task = await manager.createTask({
			type: 'secret',
			source: 'api',
			input: { apiKey: 'sk-secret-value' },
		});
		expect(JSON.stringify((await manager.getTask(task.id)).audit)).not.toContain('sk-secret-value');

		const runner = new WorkerTaskRunner('worker-test', '/path/that/does/not/exist.js');
		await expect(
			runner.run(await manager.getTask(task.id), definition('secret'), {
				taskId: task.id,
				attemptNumber: 1,
				signal: new AbortController().signal,
				updateProgress: async () => undefined,
				emitEvent: async () => undefined,
				log: async () => undefined,
				spawnChildTask: (request) => manager.createTask(request),
				getTask: (id) => manager.getTask(id),
				getDependencyResult: async () => undefined,
				checkPermission: () => true,
				getScopedServices: () => ({}),
				metadata: {},
			})
		).rejects.toThrow();
	});
});
