import { EventBus } from '../../../../src/main/core/event-bus';
import { TaskManager } from '../../../../src/main/tasks/task-manager';
import { TaskRegistry } from '../../../../src/main/tasks/task-registry';
import {
	TASK_EVENT_TYPES,
	type TaskContext,
	type TaskEvent,
	type TaskHandler,
} from '../../../../src/shared/tasks';

const logger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
};

function flushMicrotasks(): Promise<void> {
	return Promise.resolve().then(() => undefined);
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
	const registry = new TaskRegistry();
	for (const handler of handlers) registry.register(handler);
	const eventBus = new EventBus();
	const events: TaskEvent[] = [];
	for (const eventType of TASK_EVENT_TYPES) {
		eventBus.on(eventType, (event) => events.push(event.payload as TaskEvent));
	}
	const manager = new TaskManager({
		registry,
		eventBus,
		logger,
		idFactory: () => `task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
	});
	return { manager, events };
}

function createManagerWithUserFacing(
	userFacingHandlers: TaskHandler[],
	internalHandlers: TaskHandler[] = []
) {
	let nextId = 1;
	const registry = new TaskRegistry();
	for (const handler of userFacingHandlers) {
		registry.register(handler, { userFacing: true });
	}
	for (const handler of internalHandlers) {
		registry.register(handler);
	}
	const manager = new TaskManager({
		registry,
		eventBus: new EventBus(),
		logger,
		idFactory: () => `user-task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
	});
	return manager;
}

describe('TaskManager', () => {
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

	it('lists and gets current in-memory records', async () => {
		const handler = new ControlledHandler();
		const { manager } = createManager(handler);

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
		const registry = new TaskRegistry();
		registry.register(handler);
		const manager = new TaskManager({
			registry,
			eventBus: new EventBus(),
			logger,
			idFactory: () => 'long-running-task',
			now: () => new Date(nowMs).toISOString(),
		});

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
});
