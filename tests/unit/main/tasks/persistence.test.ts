jest.mock('electron-store', () => {
	return jest.fn().mockImplementation((options: { defaults?: unknown }) => {
		let state = options.defaults;
		return {
			options,
			get store() {
				return state;
			},
			set store(next: unknown) {
				state = next;
			},
		};
	});
});

import Store from 'electron-store';
import { TasksService } from '../../../../src/main/tasks';
import type { TaskContext, TaskHandler, TaskStoreState } from '../../../../src/shared/tasks';

const MockStore = Store as unknown as jest.Mock;

function flushMicrotasks(times = 4): Promise<void> {
	return Array.from({ length: times }).reduce(
		(promise) => promise.then(() => undefined),
		Promise.resolve()
	);
}

function createTaskStore() {
	return {
		getAgentService: jest.fn(() => ({
			provider: { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
			model: { id: 'gpt-5', name: 'GPT-5' },
		})),
		getTaskSettings: jest.fn(() => ({})),
	};
}

function electronStoreState(): TaskStoreState {
	return MockStore.mock.results[0]?.value.store as TaskStoreState;
}

class PersistedHandler implements TaskHandler<Record<string, never>, Record<string, unknown>> {
	readonly type = 'test.persisted';

	async run(context: TaskContext<Record<string, never>>): Promise<Record<string, unknown>> {
		context.updateProgress({ current: 1, total: 1, message: 'token=super-secret' });
		return {
			apiKey: 'super-secret',
			nested: { password: 'super-secret', visible: 'yes' },
			ignored: () => 'not serializable',
		};
	}
}

describe('TasksService persistence', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	it('uses task.json electron-store records and stores only sanitized serializable state', async () => {
		let nextId = 1;
		const service = new TasksService({
			store: createTaskStore(),
			idFactory: () => `task-${nextId++}`,
			now: () => '2026-05-20T00:00:00.000Z',
		});
		const handler = new PersistedHandler();
		service.registerHandler(handler);

		service.run({
			type: handler.type,
			title: 'Persisted task',
			input: {},
			metadata: { secret: 'super-secret', visible: 'yes' },
		});
		await flushMicrotasks();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'task',
			accessPropertiesByDotNotation: false,
			defaults: {
				schemaVersion: 1,
				records: [],
				updatedAt: '1970-01-01T00:00:00.000Z',
			},
		});
		expect(electronStoreState()).toEqual({
			schemaVersion: 1,
			records: [
				expect.objectContaining({
					id: 'task-1',
					type: handler.type,
					title: 'Persisted task',
					status: 'succeeded',
					providerId: 'openai',
					modelId: 'gpt-5',
					progress: { current: 1, total: 1, message: 'token=[redacted]' },
					metadata: { secret: '[redacted]', visible: 'yes' },
					result: {
						apiKey: '[redacted]',
						nested: { password: '[redacted]', visible: 'yes' },
					},
				}),
			],
			updatedAt: '2026-05-20T00:00:00.000Z',
		});

		const persisted = electronStoreState().records[0] as Record<string, unknown>;
		expect(persisted).not.toHaveProperty('input');
		expect(persisted).not.toHaveProperty('handler');
		expect(persisted).not.toHaveProperty('promise');
		expect(persisted).not.toHaveProperty('controller');
		expect(JSON.stringify(electronStoreState())).not.toContain('super-secret');
	});
});
