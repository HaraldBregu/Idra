import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CronTaskView } from '../../../../../src/shared/cron';
import CronPage from '../../../../../src/renderer/src/pages/settings/pages/CronPage';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.id) return `${key}:${params.id}`;
			return key;
		},
	}),
}));

function makeTask(id: string, expression = '0 * * * *'): CronTaskView {
	return {
		id,
		expression,
		data: { type: 'agent', message: `Run ${id}` },
		createdAt: '2026-01-01T00:00:00.000Z',
	};
}

describe('CronPage', () => {
	beforeEach(() => {
		window.cron = {
			...window.cron,
			list: jest.fn(async () => []),
			remove: jest.fn(async () => undefined),
		};
	});

	it('shows empty state when there are no scheduled tasks', async () => {
		render(<CronPage />);

		expect(await screen.findByText('settings.cron.emptyTitle')).toBeInTheDocument();
	});

	it('renders one card per scheduled task', async () => {
		(window.cron.list as jest.Mock).mockResolvedValue([
			makeTask('task-1', '30 8 * * 1-5'),
			makeTask('task-2', '0 0 1 * *'),
		]);

		render(<CronPage />);

		// Each task renders a remove button — two tasks means two buttons
		const removeButtons = await screen.findAllByRole('button', {
			name: /settings\.cron\.actions\.removeLabel/,
		});
		expect(removeButtons).toHaveLength(2);
	});

	it('calls remove and removes the card from the list', async () => {
		(window.cron.list as jest.Mock).mockResolvedValue([makeTask('task-1', '0 8 * * 1')]);

		const user = userEvent.setup();
		render(<CronPage />);

		const removeButton = await screen.findByRole('button', {
			name: 'settings.cron.actions.removeLabel:task-1',
		});
		await user.click(removeButton);

		await waitFor(() => {
			expect(window.cron.remove).toHaveBeenCalledWith('task-1');
		});

		await waitFor(() => {
			expect(
				screen.queryByRole('button', { name: 'settings.cron.actions.removeLabel:task-1' })
			).not.toBeInTheDocument();
		});
	});
});
