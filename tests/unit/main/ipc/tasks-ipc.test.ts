import { ipcMain } from 'electron';
import { EventBus } from '../../../../src/main/core/event-bus';
import { TasksIpc } from '../../../../src/main/ipc/tasks-ipc';
import type { MainServiceContainer } from '../../../../src/main/service-registry';
import { TaskChannels } from '../../../../src/shared/ipc-channels';
import type { TaskEvent, TaskRecord } from '../../../../src/shared/tasks';

const record: TaskRecord = {
	id: 'task-1',
	type: 'test.task',
	title: 'Test task',
	status: 'running',
	createdAt: '2026-05-20T00:00:00.000Z',
	metadata: {},
};

function registeredHandler(channel: string) {
	const call = (ipcMain.handle as jest.Mock).mock.calls.find(([name]) => name === channel);
	if (!call) throw new Error(`Handler not registered: ${channel}`);
	return call[1] as (event: unknown, ...args: unknown[]) => Promise<unknown>;
}

describe('TasksIpc', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('starts, lists, gets, and cancels records through typed IPC handlers', async () => {
		const taskManager = {
			run: jest.fn(() => record),
			list: jest.fn(() => [record]),
			get: jest.fn(() => record),
			cancel: jest.fn(() => ({ ...record, status: 'cancelling' })),
		};
		const container = {
			get: jest.fn(() => taskManager),
		} as unknown as MainServiceContainer;
		const eventBus = new EventBus();

		new TasksIpc().register(container, eventBus);

		const request = { type: record.type, title: record.title, input: { prompt: 'run' } };
		await expect(registeredHandler(TaskChannels.start)({}, request)).resolves.toEqual({
			success: true,
			data: record,
		});
		expect(taskManager.run).toHaveBeenCalledWith(request);
		await expect(registeredHandler(TaskChannels.list)({})).resolves.toEqual({
			success: true,
			data: [record],
		});
		await expect(registeredHandler(TaskChannels.get)({}, record.id)).resolves.toEqual({
			success: true,
			data: record,
		});
		await expect(registeredHandler(TaskChannels.cancel)({}, record.id)).resolves.toEqual({
			success: true,
			data: { ...record, status: 'cancelling' },
		});
	});

	it('forwards task lifecycle events to renderers on one event channel', () => {
		const taskManager = {
			run: jest.fn(),
			list: jest.fn(),
			get: jest.fn(),
			cancel: jest.fn(),
		};
		const container = {
			get: jest.fn(() => taskManager),
		} as unknown as MainServiceContainer;
		const eventBus = new EventBus();
		const broadcast = jest.spyOn(eventBus, 'broadcast');
		const event: TaskEvent = { type: 'task:created', task: record };

		new TasksIpc().register(container, eventBus);
		eventBus.emit('task:created', event);

		expect(broadcast).toHaveBeenCalledWith(TaskChannels.event, event);
	});
});
