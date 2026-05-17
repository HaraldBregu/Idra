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
		data: { type: 'message', message: `Run ${id}` },
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

	it('renders scheduled task summaries', async () => {
		(window.cron.list as jest.Mock).mockResolvedValue([
			makeTask('task-1'),
			makeTask('task-2', '*/5 * * * *'),
		]);

		render(<CronPage />);

		expect(await screen.findByText('Run task-1')).toBeInTheDocument();
		expect(screen.getByText('Run task-2')).toBeInTheDocument();
	});

	it('calls remove and updates the list when a task is deleted', async () => {
		(window.cron.list as jest.Mock).mockResolvedValue([makeTask('task-1')]);

		const user = userEvent.setup();
		render(<CronPage />);

		await screen.findByText('Run task-1');

		const removeButton = screen.getByRole('button', {
			name: 'settings.cron.actions.removeLabel:task-1',
		});
		await user.click(removeButton);

		await waitFor(() => {
			expect(window.cron.remove).toHaveBeenCalledWith('task-1');
		});

		await waitFor(() => {
			expect(screen.queryByText('Run task-1')).not.toBeInTheDocument();
		});
	});
});
