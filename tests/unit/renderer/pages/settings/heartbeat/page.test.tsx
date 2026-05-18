import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HeartbeatEventPayload, HeartbeatStatus } from '../../../../../../src/shared/heartbeat';
import HeartbeatPage from '../../../../../../src/renderer/src/pages/settings/pages/heartbeat/Page';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, params?: Record<string, string>) => {
			if (params?.session) return `${key}:${params.session}`;
			return key;
		},
	}),
}));

function makeLastHeartbeat(): HeartbeatEventPayload {
	return {
		timestamp: Date.parse('2026-05-18T10:30:00.000Z'),
		status: 'sent',
		channel: 'telegram',
		target: 'user-1',
		preview: 'Review needed',
		durationMs: 1250,
		indicatorType: 'alert',
	};
}

function makeStatus(overrides: Partial<HeartbeatStatus> = {}): HeartbeatStatus {
	return {
		enabled: true,
		runnerActive: true,
		agentCount: 2,
		nextDueMs: Date.parse('2026-05-18T11:00:00.000Z'),
		lastHeartbeat: makeLastHeartbeat(),
		...overrides,
	};
}

describe('HeartbeatPage', () => {
	beforeEach(() => {
		window.heartbeat = {
			status: jest.fn(async () => makeStatus()),
			last: jest.fn(async () => makeLastHeartbeat()),
			setEnabled: jest.fn(async (request) => makeStatus({ enabled: request.enabled })),
			systemEvent: jest.fn(async () => ({
				queued: true,
				sessionKey: 'agent:default:main',
				mode: 'now',
			})),
			request: jest.fn(async () => undefined),
			onEvent: jest.fn(() => jest.fn()),
		};
	});

	it('renders heartbeat runtime status and the latest event', async () => {
		render(<HeartbeatPage />);

		expect(await screen.findByText('settings.heartbeat.values.enabled')).toBeInTheDocument();
		expect(screen.getByText('settings.heartbeat.values.active')).toBeInTheDocument();
		expect(screen.getByText('Review needed')).toBeInTheDocument();
	});

	it('toggles global heartbeat execution', async () => {
		const user = userEvent.setup();
		render(<HeartbeatPage />);

		await user.click(await screen.findByRole('switch', {
			name: 'settings.heartbeat.runtime.toggleLabel',
		}));

		await waitFor(() => {
			expect(window.heartbeat.setEnabled).toHaveBeenCalledWith({ enabled: false });
		});
	});

	it('queues a manual wake', async () => {
		const user = userEvent.setup();
		render(<HeartbeatPage />);

		await user.click(await screen.findByRole('button', {
			name: 'settings.heartbeat.actions.wakeNow',
		}));

		await waitFor(() => {
			expect(window.heartbeat.request).toHaveBeenCalledWith({
				source: 'manual',
				intent: 'manual',
				reason: 'settings page manual wake',
			});
		});
	});

	it('queues a system event for immediate heartbeat handling', async () => {
		const user = userEvent.setup();
		render(<HeartbeatPage />);

		await user.type(
			await screen.findByPlaceholderText('settings.heartbeat.controls.systemEventPlaceholder'),
			'Check notifications'
		);
		await user.click(screen.getByRole('button', { name: 'settings.heartbeat.actions.sendNow' }));

		await waitFor(() => {
			expect(window.heartbeat.systemEvent).toHaveBeenCalledWith({
				text: 'Check notifications',
				mode: 'now',
			});
		});
	});
});
