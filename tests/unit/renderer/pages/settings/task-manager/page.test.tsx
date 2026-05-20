import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { TaskEvent, TaskRecord } from '../../../../../../src/shared/tasks';
import TaskManagerPage from '../../../../../../src/renderer/src/pages/settings/pages/task-manager/Page';
import TaskDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/task-manager/details/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => key,
	}),
}));

function makeTask(id: string, status: TaskRecord['status'] = 'running'): TaskRecord {
	return {
		id,
		type: 'agent.run',
		title: `Task ${id}`,
		status,
		createdAt: '2026-05-20T00:00:00.000Z',
		startedAt: '2026-05-20T00:00:01.000Z',
		metadata: { source: 'test' },
		progress: { current: 1, total: 2, message: 'Working' },
	};
}

function mockTasksApi(overrides: Partial<typeof window.tasks> = {}): void {
	window.tasks = {
		start: jest.fn(async () => makeTask('task-started')),
		list: jest.fn(async () => []),
		get: jest.fn(async () => undefined),
		cancel: jest.fn(async () => makeTask('task-cancelled', 'cancelling')),
		onEvent: jest.fn(() => jest.fn()),
		...overrides,
	};
}

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderTaskManagerPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/task-manager']}>
			<TaskManagerPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

function renderTaskDetailsPage(path = '/settings/task-manager/taskdetails/task-1'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/task-manager/taskdetails/:taskId" element={<TaskDetailsPage />} />
			</Routes>
		</MemoryRouter>
	);
}

describe('TaskManagerPage', () => {
	beforeEach(() => {
		mockTasksApi();
	});

	it('shows empty state when there are no tasks', async () => {
		renderTaskManagerPage();

		expect(await screen.findByText('settings.taskManager.emptyTitle')).toBeInTheDocument();
	});

	it('renders tasks from preload IPC', async () => {
		mockTasksApi({
			list: jest.fn(async () => [
				makeTask('task-1', 'running'),
				makeTask('task-2', 'succeeded'),
			]),
		});

		renderTaskManagerPage();

		expect(await screen.findByText('Task task-1')).toBeInTheDocument();
		expect(screen.getByText('Task task-2')).toBeInTheDocument();
		expect(window.tasks.list).toHaveBeenCalledTimes(1);
	});

	it('navigates to task details when a task is selected', async () => {
		mockTasksApi({
			list: jest.fn(async () => [makeTask('task-1', 'running')]),
		});

		const user = userEvent.setup();
		renderTaskManagerPage();

		await user.click(await screen.findByRole('button', { name: /Task task-1/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/task-manager/taskdetails/task-1');
	});

	it('updates the list from task lifecycle events', async () => {
		let listener: ((event: TaskEvent) => void) | null = null;
		mockTasksApi({
			onEvent: jest.fn((callback) => {
				listener = callback;
				return jest.fn();
			}),
		});

		renderTaskManagerPage();

		expect(await screen.findByText('settings.taskManager.emptyTitle')).toBeInTheDocument();
		listener?.({ type: 'task:created', task: makeTask('task-event', 'queued') });

		await waitFor(() => {
			expect(screen.getByText('Task task-event')).toBeInTheDocument();
		});
	});
});

describe('TaskDetailsPage', () => {
	beforeEach(() => {
		mockTasksApi();
	});

	it('loads task details from preload IPC', async () => {
		mockTasksApi({
			get: jest.fn(async () => ({
				...makeTask('task-1', 'succeeded'),
				finishedAt: '2026-05-20T00:00:02.000Z',
				result: { ok: true },
			})),
		});

		renderTaskDetailsPage();

		expect(await screen.findByText('Task task-1')).toBeInTheDocument();
		expect(screen.getByText('settings.taskManager.status.succeeded')).toBeInTheDocument();
		expect(screen.getByText('source')).toBeInTheDocument();
		expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
		expect(window.tasks.get).toHaveBeenCalledWith('task-1');
	});

	it('shows not found state when a task is missing', async () => {
		renderTaskDetailsPage();

		expect(await screen.findByText('settings.taskManager.notFoundTitle')).toBeInTheDocument();
	});
});
