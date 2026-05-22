import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Model } from '../../../../../../src/shared/agents/service';
import type { PublicProvider } from '../../../../../../src/shared/providers';
import type { TaskEvent, TaskRecord } from '../../../../../../src/shared/tasks';
import TaskManagerPage from '../../../../../../src/renderer/src/pages/settings/pages/task-manager/Page';
import TaskDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/task-manager/details/Page';

const openAiProvider: PublicProvider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
};

const assistantModel: Model = {
	id: 'gpt-5',
	name: 'GPT-5',
};


jest.mock('@/components/ui/select', () => {
	const Passthrough = ({ children }: { readonly children?: ReactNode }) => <div>{children}</div>;

	return {
		Select: Passthrough,
		SelectContent: Passthrough,
		SelectItem: Passthrough,
		SelectTrigger: Passthrough,
		SelectValue: () => <span />,
	};
});

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

function mockAppApi(overrides: Partial<typeof window.app> = {}): void {
	window.app = {
		...window.app,
		getProviders: jest.fn(async () => [openAiProvider]),
		getModels: jest.fn(async () => [assistantModel]),
		getAgentService: jest.fn(async () => ({ provider: openAiProvider, model: assistantModel })),
		saveAgentService: jest.fn(async () => true),
		...overrides,
	} as typeof window.app;
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


async function waitForRuntimeReady(): Promise<HTMLElement> {
	const saveButton = await screen.findByRole('button', {
		name: /settings\.taskManager\.runtime\.save/,
	});
	await waitFor(() => {
		expect(saveButton).toBeEnabled();
	});
	return saveButton;
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
		mockAppApi();
	});

	it('shows empty state when there are no tasks', async () => {
		renderTaskManagerPage();
		await waitForRuntimeReady();

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
		await waitForRuntimeReady();

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
		await waitForRuntimeReady();

		await user.click(await screen.findByRole('button', { name: /Task task-1/ }));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/task-manager/taskdetails/task-1');
	});

	it('saves the provider and model used by background tasks', async () => {
		const user = userEvent.setup();
		renderTaskManagerPage();

		const saveButton = await waitForRuntimeReady();
		await user.click(saveButton);

		await waitFor(() => {
			expect(window.app.saveAgentService).toHaveBeenCalledWith(openAiProvider, assistantModel);
		});
		expect(await screen.findByText('settings.taskManager.runtime.saved')).toBeInTheDocument();
	});

	it('creates an agent task and opens its detail page', async () => {
		mockTasksApi({
			start: jest.fn(async () => makeTask('task-created', 'queued')),
		});

		const user = userEvent.setup();
		renderTaskManagerPage();
		await waitForRuntimeReady();

		await user.type(await screen.findByLabelText('settings.taskManager.create.taskTitle'), 'Summarize');
		await user.type(screen.getByLabelText('settings.taskManager.create.message'), 'Summarize the workspace');
		await user.click(screen.getByRole('button', { name: /settings\.taskManager\.create\.start/ }));

		await waitFor(() => {
			expect(window.tasks.start).toHaveBeenCalledWith({
				type: 'agent.run',
				title: 'Summarize',
				input: { message: 'Summarize the workspace' },
			});
		});
		expect(screen.getByTestId('location')).toHaveTextContent(
			'/settings/task-manager/taskdetails/task-created'
		);
	});

	it('requires an agent task message before starting', async () => {
		const user = userEvent.setup();
		renderTaskManagerPage();
		await waitForRuntimeReady();

		await user.click(await screen.findByRole('button', { name: /settings\.taskManager\.create\.start/ }));

		expect(await screen.findByText('settings.taskManager.create.errors.messageRequired')).toBeInTheDocument();
		expect(window.tasks.start).not.toHaveBeenCalled();
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
		await waitForRuntimeReady();

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
