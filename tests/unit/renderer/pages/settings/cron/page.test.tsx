import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { CronSchedule, CronScheduledTask } from '../../../../../../src/shared/cron';
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

const now = '2026-01-01T00:00:00.000Z';

function makeSchedule(id: string, cronExpression = '0 * * * *'): CronSchedule {
	return {
		id,
		name: `Schedule ${id}`,
		description: '',
		type: 'cron',
		status: 'active',
		source: 'agent',
		createdBy: 'agent',
		visibility: 'user',
		timezone: 'UTC',
		cronExpression,
		runCount: 0,
		missedRunPolicy: 'skip',
		concurrencyPolicy: 'skipIfRunning',
		retryPolicy: {
			maxAttempts: 1,
			initialDelayMs: 1000,
			maxDelayMs: 1000,
			backoffMultiplier: 1,
			jitter: false,
			retryableErrorCodes: [],
			nonRetryableErrorCodes: [],
		},
		taskType: 'agent.run',
		taskInput: { message: `Run ${id}` },
		taskPriority: 'normal',
		taskTags: [],
		taskMetadata: {},
		requiredPermissions: [],
		requiresConfirmation: false,
		enabled: true,
		createdAt: now,
		updatedAt: now,
		metadata: {},
		audit: [],
	};
}

function makeScheduledTask(scheduleId: string): CronScheduledTask {
	return {
		id: 'task-1',
		type: 'agent.run',
		title: 'Agent run',
		source: 'cron',
		sourceId: scheduleId,
		input: { message: 'Run now' },
		status: 'queued',
		priority: 'normal',
		visibility: 'user',
		tags: [],
		metadata: {},
		createdAt: now,
		updatedAt: now,
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

function renderCronDetailsPage(path = '/settings/cron/crondetails/schedule-1'): void {
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
		window.cron = {
			...window.cron,
			listSchedules: jest.fn(async () => []),
			getSchedule: jest.fn(async () => makeSchedule('schedule-1')),
			pauseSchedule: jest.fn(async () => undefined),
			resumeSchedule: jest.fn(async () => undefined),
			deleteSchedule: jest.fn(async () => undefined),
			runNow: jest.fn(async (scheduleId: string) => makeScheduledTask(scheduleId)),
			subscribeToSchedules: jest.fn(() => jest.fn()),
		};
	});

	it('shows empty state when there are no scheduled tasks', async () => {
		renderCronPage();

		expect(await screen.findByText('settings.cron.emptyTitle')).toBeInTheDocument();
		expect(window.cron.listSchedules).toHaveBeenCalledWith({ includeDeleted: false });
	});

	it('renders one row per scheduled task without a create form', async () => {
		(window.cron.listSchedules as jest.Mock).mockResolvedValue([
			makeSchedule('schedule-1', '30 8 * * 1-5'),
			makeSchedule('schedule-2', '0 0 1 * *'),
		]);

		renderCronPage();

		expect(await screen.findByText('Schedule schedule-1')).toBeInTheDocument();
		expect(screen.getByText('Schedule schedule-2')).toBeInTheDocument();
		expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Schedule task' })).not.toBeInTheDocument();
	});

	it('navigates to schedule details when a scheduled task is selected', async () => {
		(window.cron.listSchedules as jest.Mock).mockResolvedValue([makeSchedule('schedule-1')]);

		const user = userEvent.setup();
		renderCronPage();

		await user.click(await screen.findByText('Schedule schedule-1'));

		expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron/crondetails/schedule-1');
	});

	it('pauses and runs scheduled tasks from the list', async () => {
		(window.cron.listSchedules as jest.Mock).mockResolvedValue([makeSchedule('schedule-1')]);

		const user = userEvent.setup();
		renderCronPage();

		await user.click(await screen.findByRole('button', { name: 'settings.cron.actions.pause' }));
		await waitFor(() => {
			expect(window.cron.pauseSchedule).toHaveBeenCalledWith('schedule-1');
		});

		await user.click(await screen.findByRole('button', { name: 'settings.cron.actions.run' }));
		await waitFor(() => {
			expect(window.cron.runNow).toHaveBeenCalledWith('schedule-1');
		});
	});

	it('does not delete from the list when confirmation is cancelled', async () => {
		(window.cron.listSchedules as jest.Mock).mockResolvedValue([makeSchedule('schedule-1')]);
		const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);

		const user = userEvent.setup();
		renderCronPage();

		await user.click(await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:Schedule schedule-1',
		}));

		expect(confirm).toHaveBeenCalledWith('settings.cron.actions.confirmRemove:Schedule schedule-1');
		expect(window.cron.deleteSchedule).not.toHaveBeenCalled();
	});

	it('loads schedule details through schedule IPC', async () => {
		(window.cron.getSchedule as jest.Mock).mockResolvedValue(makeSchedule('schedule-1', '0 8 * * 1'));

		renderCronDetailsPage();

		expect(await screen.findByText('Schedule schedule-1')).toBeInTheDocument();
		expect(window.cron.getSchedule).toHaveBeenCalledWith('schedule-1');
	});

	it('confirms and deletes a schedule from the details page', async () => {
		(window.cron.getSchedule as jest.Mock).mockResolvedValue(makeSchedule('schedule-1', '0 8 * * 1'));
		jest.spyOn(window, 'confirm').mockReturnValue(true);

		const user = userEvent.setup();
		renderCronDetailsPage();

		const deleteButton = await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:Schedule schedule-1',
		});
		await user.click(deleteButton);

		await waitFor(() => {
			expect(window.cron.deleteSchedule).toHaveBeenCalledWith('schedule-1');
		});

		await waitFor(() => {
			expect(screen.getByTestId('location')).toHaveTextContent('/settings/cron');
		});
	});
});
