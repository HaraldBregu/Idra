import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Model } from '../../../../../../src/shared/agents/service';
import type { FridayCronJob } from '../../../../../../src/shared/cron';
import type { PublicProvider } from '../../../../../../src/shared/providers';
import CronPage from '../../../../../../src/renderer/src/pages/settings/pages/cron/Page';
import CronDetailsPage from '../../../../../../src/renderer/src/pages/settings/pages/cron/details/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.id) return `${key}:${params.id}`;
			return key;
		},
	}),
}));

const openAiProvider: PublicProvider = {
	id: 'openai',
	name: 'OpenAI',
	baseUrl: 'https://api.openai.com/v1',
};

const assistantModel: Model = {
	id: 'gpt-5',
	name: 'GPT-5',
};

function makeJob(id: string, expr = '0 * * * *'): FridayCronJob {
	return {
		id,
		name: `Job ${id}`,
		description: '',
		enabled: true,
		createdAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
		updatedAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
		schedule: { kind: 'cron', expr, tz: 'UTC' },
		sessionTarget: 'isolated',
		wakeMode: 'now',
		payload: { kind: 'agentTurn', message: `Run ${id}` },
		delivery: { mode: 'announce' },
		state: {
			consecutiveErrors: 0,
			consecutiveSkipped: 0,
			consecutiveScheduleErrors: 0,
			attempts: 0,
		},
	};
}

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderCronPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/cron']}>
			<CronPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

function renderCronDetailsPage(path = '/settings/cron/crondetails/task-1'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/cron/crondetails/:jobId" element={<CronDetailsPage />} />
				<Route path="/settings/cron" element={<div>Cron list</div>} />
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

describe('CronPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			getProviders: jest.fn(async () => [openAiProvider]),
			getModels: jest.fn(async () => [assistantModel]),
			getAgentService: jest.fn(async () => ({ provider: openAiProvider, model: assistantModel })),
			saveAgentService: jest.fn(async () => true),
		} as typeof window.app;

		window.cron = {
			...window.cron,
			listJobs: jest.fn(async () => []),
			action: jest.fn(async () => ({ status: 'ok', result: makeJob('task-1') })),
			removeJob: jest.fn(async () => undefined),
		};
	});

	it('shows empty state when there are no scheduled tasks', async () => {
		renderCronPage();

		expect(await screen.findByText('settings.cron.emptyTitle')).toBeInTheDocument();
	});

	it('saves the provider and model used by scheduled agent tasks', async () => {
		const user = userEvent.setup();
		renderCronPage();

		const saveButton = await screen.findByRole('button', {
			name: /settings\.cron\.runtime\.save/,
		});
		await waitFor(() => {
			expect(saveButton).toBeEnabled();
		});
		await user.click(saveButton);

		await waitFor(() => {
			expect(window.app.saveAgentService).toHaveBeenCalledWith(openAiProvider, assistantModel);
		});
		expect(await screen.findByText('settings.cron.runtime.saved')).toBeInTheDocument();
	});

	it('renders one card per scheduled task', async () => {
		(window.cron.listJobs as jest.Mock).mockResolvedValue([
			makeJob('task-1', '30 8 * * 1-5'),
			makeJob('task-2', '0 0 1 * *'),
		]);

		renderCronPage();

		expect(await screen.findByText('Job task-1')).toBeInTheDocument();
		expect(screen.getByText('Job task-2')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /settings\.cron\.actions\.removeLabel/ })
		).not.toBeInTheDocument();
	});

	it('navigates to job details when a scheduled task is selected', async () => {
		(window.cron.listJobs as jest.Mock).mockResolvedValue([makeJob('task-1', '30 8 * * 1-5')]);

		const user = userEvent.setup();
		renderCronPage();

		await user.click(await screen.findByText('Job task-1'));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron/crondetails/task-1');
	});

	it('creates scheduled agent tasks without provider or model runtime configuration', async () => {
		const user = userEvent.setup();
		renderCronPage();

		await user.type(await screen.findByLabelText('Name'), 'Morning report');
		await user.type(screen.getByLabelText('Expression'), '0 9 * * 1-5');
		await user.type(screen.getByLabelText('Prompt'), 'Summarize inbox');
		await user.click(screen.getByRole('button', { name: 'Schedule task' }));

		await waitFor(() => {
			expect(window.cron.action).toHaveBeenCalledWith({
				action: 'add',
				job: {
					name: 'Morning report',
					schedule: { kind: 'cron', expr: '0 9 * * 1-5' },
					payload: { kind: 'agentTurn', message: 'Summarize inbox' },
				},
			});
		});

		const request = (window.cron.action as jest.Mock).mock.calls[0][0] as {
			job: Record<string, unknown> & { payload: Record<string, unknown> };
		};
		expect(request.job).not.toHaveProperty('provider');
		expect(request.job).not.toHaveProperty('providerId');
		expect(request.job).not.toHaveProperty('model');
		expect(request.job.payload).not.toHaveProperty('provider');
		expect(request.job.payload).not.toHaveProperty('providerId');
		expect(request.job.payload).not.toHaveProperty('model');
	});

	it('does not remove a job from details when confirmation is cancelled', async () => {
		(window.cron.action as jest.Mock).mockResolvedValue({
			status: 'ok',
			result: makeJob('task-1', '0 8 * * 1'),
		});
		const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

		const user = userEvent.setup();
		renderCronDetailsPage();

		const deleteButton = await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:task-1',
		});
		await user.click(deleteButton);

		expect(confirm).toHaveBeenCalledWith('settings.cron.actions.confirmRemove:task-1');
		expect(window.cron.removeJob).not.toHaveBeenCalled();
		expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron/crondetails/task-1');
	});

	it('confirms and removes a job from the details page', async () => {
		(window.cron.action as jest.Mock).mockResolvedValue({
			status: 'ok',
			result: makeJob('task-1', '0 8 * * 1'),
		});
		jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		renderCronDetailsPage();

		const deleteButton = await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:task-1',
		});
		await user.click(deleteButton);

		await waitFor(() => {
			expect(window.cron.removeJob).toHaveBeenCalledWith('task-1');
		});

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron');
		});
	});
});
