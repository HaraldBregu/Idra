import { ipcRenderer } from 'electron';
import { tasks } from '../../../../src/preload';
import { TaskChannels } from '../../../../src/shared/ipc-channels';
import type { TaskEvent, TaskRecord } from '../../../../src/shared/tasks';

const mockedIpcRenderer = ipcRenderer as jest.Mocked<typeof ipcRenderer>;

const record: TaskRecord = {
	id: 'task-1',
	type: 'agent.run',
	title: 'Agent task',
	status: 'queued',
	createdAt: '2026-05-20T00:00:00.000Z',
	metadata: {},
};

describe('tasks preload API', () => {
	beforeEach(() => {
		mockedIpcRenderer.invoke.mockReset();
		mockedIpcRenderer.on.mockReset();
		mockedIpcRenderer.removeListener.mockReset();
	});

	it('starts, retrieves, and cancels tasks through typed IPC channels', async () => {
		const request = {
			type: 'agent.run',
			title: 'Agent task',
			input: { message: 'Summarize this.' },
		};
		mockedIpcRenderer.invoke
			.mockResolvedValueOnce({ success: true, data: record })
			.mockResolvedValueOnce({ success: true, data: [record] })
			.mockResolvedValueOnce({ success: true, data: record })
			.mockResolvedValueOnce({ success: true, data: { ...record, status: 'cancelling' } });

		await expect(tasks.start(request)).resolves.toEqual(record);
		await expect(tasks.list()).resolves.toEqual([record]);
		await expect(tasks.get(record.id)).resolves.toEqual(record);
		await expect(tasks.cancel(record.id)).resolves.toEqual({
			...record,
			status: 'cancelling',
		});

		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(
			1,
			TaskChannels.start,
			request
		);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(2, TaskChannels.list);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(3, TaskChannels.get, record.id);
		expect(mockedIpcRenderer.invoke).toHaveBeenNthCalledWith(4, TaskChannels.cancel, record.id);
	});

	it('subscribes and unsubscribes from task lifecycle events', () => {
		let ipcListener: Parameters<typeof mockedIpcRenderer.on>[1] | null = null;
		mockedIpcRenderer.on.mockImplementation((_channel, listener) => {
			ipcListener = listener;
			return mockedIpcRenderer;
		});
		mockedIpcRenderer.removeListener.mockReturnValue(mockedIpcRenderer);
		const callback = jest.fn();
		const event: TaskEvent = { type: 'task:created', task: record };

		const unsubscribe = tasks.onEvent(callback);
		ipcListener?.({} as Electron.IpcRendererEvent, event);
		unsubscribe();

		expect(mockedIpcRenderer.on).toHaveBeenCalledWith(TaskChannels.event, expect.any(Function));
		expect(callback).toHaveBeenCalledWith(event);
		expect(mockedIpcRenderer.removeListener).toHaveBeenCalledWith(
			TaskChannels.event,
			ipcListener
		);
	});
});
