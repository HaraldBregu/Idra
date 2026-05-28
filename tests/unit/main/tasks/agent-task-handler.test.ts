import { DEFAULT_AGENT_ID } from '../../../../src/main/agent/constants';
import { AGENT_TASK_TYPE, TasksService, type TaskPersistencePort } from '../../../../src/main/tasks';
import type { TaskStoreState } from '../../../../src/shared/tasks';

function flushMicrotasks(times = 4): Promise<void> {
	return Array.from({ length: times }).reduce(
		(promise) => promise.then(() => undefined),
		Promise.resolve()
	);
}

function defaultSelection() {
	return {
		provider: {
			id: ' openai ',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
		},
		model: {
			id: ' gpt-5 ',
			name: 'GPT-5',
		},
	};
}

function createPersistence(): TaskPersistencePort {
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

function createManager(options: { selection?: ReturnType<typeof defaultSelection> } = {}) {
	const selection = 'selection' in options ? options.selection : defaultSelection();
	let nextId = 1;
	const store = {
		getAgentService: jest.fn(() => selection),
		getTaskSettings: jest.fn(() => ({})),
	};
	const manager = new TasksService({
		store,
		idFactory: () => `task-${nextId++}`,
		now: () => new Date(1_778_880_000_000 + nextId).toISOString(),
		persistence: createPersistence(),
	});
	return { manager, store };
}

describe('agent background tasks', () => {
	it('starts an isolated agent session with configured provider settings', async () => {
		const send = jest.fn(async () => 'agent output');
		const cancel = jest.fn();
		const { manager, store } = createManager();
		manager.configureAgentRuntime({ send, cancel });

		const task = manager.startUserTask({
			type: AGENT_TASK_TYPE,
			title: 'Agent task',
			input: {
				message: ' Summarize reports ',
			},
		});
		await flushMicrotasks();

		expect(send).toHaveBeenCalledWith('Summarize reports', DEFAULT_AGENT_ID, {
			sessionId: 'task:task-1',
			providerId: 'openai',
			model: 'gpt-5',
		});
		expect(store.getAgentService).toHaveBeenCalled();
		expect(manager.get(task.id)).toMatchObject({
			status: 'succeeded',
			providerId: 'openai',
			modelId: 'gpt-5',
			result: { text: 'agent output' },
		});
	});

	it('rejects runtime overrides and secret-looking instructions', () => {
		const { manager } = createManager();

		expect(() =>
			manager.startUserTask({
				type: AGENT_TASK_TYPE,
				title: 'Agent task',
				input: {
					message: 'Run background research',
					providerId: 'openai',
				},
			})
		).toThrow(/providerId is not allowed/);
		expect(() =>
			manager.startUserTask({
				type: AGENT_TASK_TYPE,
				title: 'Agent task',
				input: {
					message: 'Authorization: Bearer secret-token',
				},
			})
		).toThrow(/secret-looking/);
	});

	it('requires store-backed agent settings before sending', async () => {
		const send = jest.fn();
		const cancel = jest.fn();
		const { manager } = createManager({ selection: undefined });
		manager.configureAgentRuntime({ send, cancel });

		const task = manager.startUserTask({
			type: AGENT_TASK_TYPE,
			title: 'Agent task',
			input: {
				message: 'Run background research',
			},
		});
		await flushMicrotasks();

		expect(manager.get(task.id)).toMatchObject({
			status: 'failed',
			error: {
				message: 'Agent provider not configured.',
			},
		});
		expect(send).not.toHaveBeenCalled();
	});

	it('cancels the agent session when the task signal aborts', async () => {
		let rejectSend: ((error: unknown) => void) | undefined;
		const send = jest.fn(
			() =>
				new Promise<string>((_resolve, reject) => {
					rejectSend = reject;
				})
		);
		const cancel = jest.fn();
		const { manager } = createManager();
		manager.configureAgentRuntime({ send, cancel });

		const task = manager.startUserTask({
			type: AGENT_TASK_TYPE,
			title: 'Agent task',
			input: {
				message: 'Run background research',
			},
		});
		await flushMicrotasks(2);
		manager.cancel(task.id);
		rejectSend?.(new Error('cancelled'));
		await flushMicrotasks();

		expect(manager.get(task.id)?.status).toBe('cancelled');
		expect(cancel).toHaveBeenCalledWith('task:task-1');
	});
});
