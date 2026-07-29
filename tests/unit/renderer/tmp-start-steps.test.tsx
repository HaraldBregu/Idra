import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChannelStep } from '../../../src/renderer/src/pages/start/components/ChannelStep';
import { SETUP_STEPS, SETUP_STEP_TITLES } from '../../../src/renderer/src/pages/start/constants';

const channelsApi = {
	getConfig: jest.fn(),
	saveChannelConfig: jest.fn(),
};

beforeEach(() => {
	Object.defineProperty(window, 'channels', { configurable: true, value: channelsApi });
	channelsApi.getConfig.mockResolvedValue({
		telegram: { token: '', allowFrom: [] },
		discord: { token: '', allowFrom: [] },
	});
	channelsApi.saveChannelConfig.mockImplementation(async (_type, config) => config);
});

describe('start setup steps', () => {
	it('orders the steps model provider, object storage, channel provider, models', () => {
		expect(SETUP_STEPS.map((step) => SETUP_STEP_TITLES[step])).toEqual([
			'Welcome',
			'Model provider',
			'Object storage',
			'Channel provider',
			'Models',
		]);
	});

	it('lists channel providers and saves a bot token', async () => {
		const user = userEvent.setup();
		render(<ChannelStep />);

		expect(await screen.findByText('Connect a channel provider')).toBeInTheDocument();
		expect(screen.getByText('Discord')).toBeInTheDocument();
		expect(screen.getByText('Telegram')).toBeInTheDocument();

		await user.type(await screen.findByLabelText('Telegram bot token'), 'bot-token');
		await user.click(screen.getByLabelText('Discord bot token'));

		await waitFor(() =>
			expect(channelsApi.saveChannelConfig).toHaveBeenCalledWith(
				'telegram',
				expect.objectContaining({ token: 'bot-token', enabled: true })
			)
		);
	});
});
