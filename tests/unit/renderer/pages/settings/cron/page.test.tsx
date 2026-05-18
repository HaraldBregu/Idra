import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OpenClawCronJob } from '../../../../../../src/shared/cron';
import CronPage from '../../../../../../src/renderer/src/pages/settings/pages/cron/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.id) return `${key}:${params.id}`;
			return key;
		},
	}),
}));

function makeJob(id: string, expr = '0 * * * *'): OpenClawCronJob {
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

describe('CronPage', () => {
	beforeEach(() => {
		window.cron = {
			...window.cron,
			listJobs: jest.fn(async () => []),
			removeJob: jest.fn(async () => undefined),
		};
	});

	it('shows empty state when there are no scheduled tasks', async () => {
		render(<CronPage />);

		expect(await screen.findByText('settings.cron.emptyTitle')).toBeInTheDocument();
	});

	it('renders one card per scheduled task', async () => {
		(window.cron.listJobs as jest.Mock).mockResolvedValue([
			makeJob('task-1', '30 8 * * 1-5'),
			makeJob('task-2', '0 0 1 * *'),
		]);

		render(<CronPage />);

		// Each task renders a remove button — two tasks means two buttons
		const removeButtons = await screen.findAllByRole('button', {
			name: /settings\.cron\.actions\.removeLabel/,
		});
		expect(removeButtons).toHaveLength(2);
	});

	it('lets more than one scheduled task stay expanded', async () => {
		(window.cron.listJobs as jest.Mock).mockResolvedValue([
			makeJob('task-1', '30 8 * * 1-5'),
			makeJob('task-2', '0 0 1 * *'),
		]);

		const user = userEvent.setup();
		render(<CronPage />);

		await user.click(await screen.findByRole('button', {
			name: 'settings.cron.actions.expandLabel:task-1',
		}));
		await user.click(await screen.findByRole('button', {
			name: 'settings.cron.actions.expandLabel:task-2',
		}));

		expect(screen.getByRole('button', {
			name: 'settings.cron.actions.collapseLabel:task-1',
		})).toBeInTheDocument();
		expect(screen.getByRole('button', {
			name: 'settings.cron.actions.collapseLabel:task-2',
		})).toBeInTheDocument();
	});

	it('calls remove and removes the card from the list', async () => {
		(window.cron.listJobs as jest.Mock).mockResolvedValue([makeJob('task-1', '0 8 * * 1')]);

		const user = userEvent.setup();
		render(<CronPage />);

		const removeButton = await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:task-1',
		});
		await user.click(removeButton);

		await waitFor(() => {
			expect(window.cron.removeJob).toHaveBeenCalledWith('task-1');
		});

		await waitFor(() => {
			expect(
				screen.queryByRole('button', { name: 'settings.cron.actions.removeLabel:task-1' })
			).not.toBeInTheDocument();
		});
	});
});
