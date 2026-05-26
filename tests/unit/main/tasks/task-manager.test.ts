import { EventBus } from '../../../../src/main/core/event-bus';
import { TasksService, type TaskPersistencePort } from '../../../../src/main/tasks';
import {
	TASK_EVENT_TYPES,
	type TaskContext,
	type TaskEvent,
	type TaskHandler,
	type TaskStoreState,
} from '../../../../src/shared/tasks';
import type { TaskSettings } from '../../../../src/shared/store';

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

function flushMicrotasks(): Promise<void> {
	return Promise.resolve().then(() => undefined);
}

function createTaskStore(policy?: () => TaskSettings) {
	return {
		getAgentService: jest.fn(() => ({
			provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
			model: { id: 'gpt-5', name: 'GPT-5' },
		})),
		getTaskSettings: jest.fn(policy ?? (() => ({}))),
	};
}

function createPersistence(
	initial: TaskStoreState = {
		schemaVersion: 1,
		records: [],
		updatedAt: new Date(0).toISOString(),
	}
): TaskPersistencePort & { save: jest.Mock } {
	let state = initial;
	return {
		load: jest.fn(() => state),
		save: jest.fn((next: TaskStoreState) => {
			state = next;
		}),
	};
}

class ControlledHandler implements TaskHandler<{ key: string }, string> {
	readonly type = 'test.controlled';
	readonly starts: string[] = [];
	private readonly controls = new Map<
		string,
		{ resolve: (value: string) => void; reject: (error: unknown) => void }
	>();

	run(context: TaskContext<{ key: string }>): Promise<string> {
		this.starts.push(context.input.key);
		return new Promise((resolve, reject) => {
			this.controls.set(context.input.key, { resolve, reject });
		});
	}

	resolve(key: string, value: string): void {
		const control = this.controls.get(key);
		if (!control) throw new Error(`Missing control: ${key}`);
		control.resolve(value);
	}

	reject(key: string, error: unknown): void {
		const control = this.controls.get(key);
		if (!control) throw new Error(`Missing control: ${key}`);
		control.reject(error);
	}
}

class AbortAwareHandler implements TaskHandler<{ key: string }, string> {
	readonly type = 'test.abortable';

	run(context: TaskContext<{ key: string }>): Promise<string> {
		context.updateProgress({ message: 'running' });
		return new Promise((resolve) => {
			context.signal.addEventListener('abort', () => resolve('stopped'), { once: true });
		});
	}
}

function createManager(...handlers: TaskHandler[]) {
	let nextId = 1;
	const eventBus = new EventBus();
	const events: TaskEvent[] = [];
	for (const eventType of TASK_EVENT_TYPES) {
		eventBus.on(eventType, (event) => events.push(event.payload as TaskEvent));
	}
	const persistence = createPersistence();
	const manager = new TasksService({
		store: createTaskStore(),
		eventBus,
		logger,
		idFactory: () => `task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
		persistence,
	});
	for (const handler of handlers) manager.registerHandler(handler);
	return { manager, events, persistence };
}

function createManagerWithPolicy(policy: () => TaskSettings, ...handlers: TaskHandler[]) {
	let nextId = 1;
	const eventBus = new EventBus();
	const events: TaskEvent[] = [];
	for (const eventType of TASK_EVENT_TYPES) {
		eventBus.on(eventType, (event) => events.push(event.payload as TaskEvent));
	}
	const manager = new TasksService({
		store: createTaskStore(policy),
		eventBus,
		logger,
		idFactory: () => `task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
		persistence: createPersistence(),
	});
	for (const handler of handlers) manager.registerHandler(handler);
	return { manager, events };
}

function createManagerWithUserFacing(
	userFacingHandlers: TaskHandler[],
	internalHandlers: TaskHandler[] = [],
	allowedTaskTypes?: string[]
) {
	let nextId = 1;
	const manager = new TasksService({
		store: createTaskStore(allowedTaskTypes ? () => ({ allowedTaskTypes }) : undefined),
		eventBus: new EventBus(),
		logger,
		idFactory: () => `user-task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
		persistence: createPersistence(),
	});
	for (const handler of userFacingHandlers) {
		manager.registerHandler(handler, { userFacing: true });
	}
	for (const handler of internalHandlers) {
		manager.registerHandler(handler);
	}
	return manager;
}

describe('TasksService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('runs concurrent tasks and lets them complete independently', async () => {
		const handler = new ControlledHandler();
		const { manager } = createManager(handler);

		const first = manager.run({ type: handler.type, title: 'First', input: { key: 'a' } });
		const second = manager.run({ type: handler.type, title: 'Second', input: { key: 'b' } });
		await flushMicrotasks();

		expect(first.status).toBe('queued');
		expect(second.status).toBe('queued');
		expect(manager.get(first.id)?.status).toBe('running');
		expect(manager.get(second.id)?.status).toBe('running');

		handler.resolve('b', 'second result');
		await flushMicrotasks();

		expect(manager.get(second.id)).toMatchObject({
			status: 'succeeded',
			result: 'second result',
		});
		expect(manager.get(first.id)?.status).toBe('running');

		handler.resolve('a', 'first result');
		await flushMicrotasks();

		expect(manager.get(first.id)).toMatchObject({
			status: 'succeeded',
			result: 'first result',
		});
	});

	it('uses defaultConcurrency to keep overflow tasks queued until capacity is available', async () => {
		const handler = new ControlledHandler();
		const { manager } = createManagerWithPolicy(() => ({ defaultConcurrency: 1 }), handler);

		const first = manager.run({ type: handler.type, title: 'First', input: { key: 'a' } });
		const second = manager.run({ type: handler.type, title: 'Second', input: { key: 'b' } });
		const third = manager.run({ type: handler.type, title: 'Third', input: { key: 'c' } });
		await flushMicrotasks();

		expect(handler.starts).toEqual(['a']);
		expect(manager.get(first.id)?.status).toBe('running');
		expect(manager.get(second.id)?.status).toBe('queued');
		expect(manager.get(third.id)?.status).toBe('queued');

		handler.resolve('a', 'first result');
		await flushMicrotasks();

		expect(handler.starts).toEqual(['a', 'b']);
		expect(manager.get(first.id)).toMatchObject({
			status: 'succeeded',
			result: 'first result',
		});
		expect(manager.get(second.id)?.status).toBe('running');
		expect(manager.get(third.id)?.status).toBe('queued');

		handler.resolve('b', 'second result');
		await flushMicrotasks();

		expect(handler.starts).toEqual(['a', 'b', 'c']);
		expect(manager.get(second.id)?.status).toBe('succeeded');
		expect(manager.get(third.id)?.status).toBe('running');

		handler.resolve('c', 'third result');
		await flushMicrotasks();
		expect(manager.get(third.id)?.status).toBe('succeeded');
	});

	it('cancels queued tasks without starting their handlers', async () => {
		const handler = new ControlledHandler();
		const { manager } = createManagerWithPolicy(() => ({ defaultConcurrency: 1 }), handler);

		const first = manager.run({ type: handler.type, title: 'First', input: { key: 'a' } });
		const second = manager.run({ type: handler.type, title: 'Second', input: { key: 'b' } });
		const third = manager.run({ type: handler.type, title: 'Third', input: { key: 'c' } });
		await flushMicrotasks();

		expect(manager.cancel(second.id).status).toBe('cancelled');
		expect(handler.starts).toEqual(['a']);

		handler.resolve('a', 'first result');
		await flushMicrotasks();

		expect(handler.starts).toEqual(['a', 'c']);
		expect(manager.get(first.id)?.status).toBe('succeeded');
		expect(manager.get(second.id)?.status).toBe('cancelled');
		expect(manager.get(third.id)?.status).toBe('running');

		handler.resolve('c', 'third result');
		await flushMicrotasks();
		expect(manager.get(third.id)?.status).toBe('succeeded');
	});

	it('lists and gets current in-memory records', async () => {
		const handler = new ControlledHandler();
		const { manager, persistence } = createManager(handler);

		const task = manager.run({
			type: handler.type,
			title: 'Inspectable task',
			input: { key: 'a' },
			metadata: { token: 'secret', visible: 'yes' },
		});
		await flushMicrotasks();

		expect(manager.list()).toHaveLength(1);
		expect(manager.get(task.id)).toMatchObject({
			id: task.id,
			status: 'running',
			metadata: { token: '[redacted]', visible: 'yes' },
		});
		expect(persistence.save).toHaveBeenLastCalledWith({
			schemaVersion: 1,
			records: [
				expect.objectContaining({
					id: task.id,
					type: handler.type,
					metadata: { token: '[redacted]', visible: 'yes' },
				}),
			],
			updatedAt: expect.any(String),
		});
	});

	it('starts user-created tasks only for approved user-facing task types', async () => {
		const approved = new ControlledHandler();
		const internal = new ControlledHandler();
		Object.defineProperty(internal, 'type', { value: 'test.internal' });
		const manager = createManagerWithUserFacing([approved], [internal]);

		const task = manager.startUserTask({
			type: approved.type,
			title: 'Approved task',
			input: { key: 'a' },
		});
		await flushMicrotasks();

		expect(task.status).toBe('queued');
		expect(manager.get(task.id)?.status).toBe('running');
		expect(() =>
			manager.startUserTask({
				type: internal.type,
				title: 'Internal task',
				input: { key: 'b' },
			})
		).toThrow(/not approved for renderer start/);
	});

	it('applies backgroundTask allowed task policy to user-created tasks', () => {
		const approved = new ControlledHandler();
		const blocked = new ControlledHandler();
		Object.defineProperty(blocked, 'type', { value: 'test.blocked' });
		const manager = createManagerWithUserFacing([approved, blocked], [], [approved.type]);

		expect(() =>
			manager.startUserTask({
				type: blocked.type,
				title: 'Blocked task',
				input: { key: 'b' },
			})
		).toThrow(/not allowed by background task policy/);
	});

	it('moves a running task through cancelling to cancelled', async () => {
		const handler = new AbortAwareHandler();
		const { manager, events } = createManager(handler);
		const task = manager.run({ type: handler.type, title: 'Abortable', input: { key: 'a' } });
		await flushMicrotasks();

		const cancelling = manager.cancel(task.id);
		await flushMicrotasks();

		expect(cancelling.status).toBe('cancelling');
		expect(manager.get(task.id)?.status).toBe('cancelled');
		expect(events.map((event) => event.type)).toEqual([
			'task:created',
			'task:started',
			'task:updated',
			'task:updated',
			'task:cancelled',
		]);
	});

	it('keeps one record per operation after terminal states', async () => {
		const success = new ControlledHandler();
		const failure = new ControlledHandler();
		Object.defineProperty(failure, 'type', { value: 'test.failure' });
		const abortable = new AbortAwareHandler();
		const { manager } = createManager(success, failure, abortable);

		const succeeded = manager.run({
			type: success.type,
			title: 'Succeed',
			input: { key: 's' },
		});
		const failed = manager.run({
			type: failure.type,
			title: 'Fail',
			input: { key: 'f' },
		});
		const cancelled = manager.run({
			type: abortable.type,
			title: 'Cancel',
			input: { key: 'c' },
		});
		await flushMicrotasks();

		success.resolve('s', 'ok');
		failure.reject('f', new Error('boom'));
		manager.cancel(cancelled.id);
		await flushMicrotasks();

		expect(manager.list()).toHaveLength(3);
		expect(manager.get(succeeded.id)?.status).toBe('succeeded');
		expect(manager.get(failed.id)?.status).toBe('failed');
		expect(manager.get(cancelled.id)?.status).toBe('cancelled');
	});

	it('does not fail or cancel a running task because elapsed time passes', async () => {
		const handler = new ControlledHandler();
		let nowMs = 1_778_880_000_000;
		const manager = new TasksService({
			store: createTaskStore(),
			eventBus: new EventBus(),
			logger,
			idFactory: () => 'long-running-task',
			now: () => new Date(nowMs).toISOString(),
			persistence: createPersistence(),
		});
		manager.registerHandler(handler);

		const task = manager.run({
			type: handler.type,
			title: 'Long running',
			input: { key: 'a' },
		});
		await flushMicrotasks();
		nowMs += 24 * 60 * 60_000;

		expect(manager.get(task.id)?.status).toBe('running');
		expect(manager.list()[0]?.status).toBe('running');
	});

	it('marks persisted active records as interrupted because runtime state is not serializable', () => {
		const persistence = createPersistence({
			schemaVersion: 1,
			records: [
				{
					id: 'persisted-running',
					type: 'test.controlled',
					title: 'Persisted running task',
					status: 'running',
					createdAt: '2026-05-20T00:00:00.000Z',
					startedAt: '2026-05-20T00:00:01.000Z',
					metadata: { visible: 'yes' },
				},
			],
			updatedAt: '2026-05-20T00:00:02.000Z',
		});
		const manager = new TasksService({
			store: createTaskStore(),
			logger,
			now: () => '2026-05-20T00:00:03.000Z',
			persistence,
		});

		expect(manager.get('persisted-running')).toMatchObject({
			status: 'failed',
			finishedAt: '2026-05-20T00:00:03.000Z',
			error: {
				code: 'TaskInterrupted',
				message: 'Task did not finish before the app stopped.',
			},
		});
		expect(persistence.save).toHaveBeenLastCalledWith({
			schemaVersion: 1,
			records: [
				expect.objectContaining({
					id: 'persisted-running',
					status: 'failed',
				}),
			],
			updatedAt: '2026-05-20T00:00:03.000Z',
		});
		expect(logger.warn).toHaveBeenCalledWith(
			'TasksService',
			'Marking interrupted persisted task as failed',
			expect.objectContaining({ id: 'persisted-running', status: 'running' })
		);
	});
});
