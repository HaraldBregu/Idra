import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CHANNEL_PROVIDER_IDS, type Channel, type ChannelType } from '../../../../../src/shared/channels';
import { listChannelCatalog } from '../../../../../src/shared/channel-catalog';
import ChannelsPage from '../../../../../src/renderer/src/pages/settings/pages/ChannelsPage';

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'common.save': 'Save',
				'settings.channels.token': 'Token',
				'settings.channels.tokenPlaceholder': 'Paste token or access key',
			};
			return translations[key] ?? key;
		},
	}),
}));

function createChannelConfig(): Channel {
	return CHANNEL_PROVIDER_IDS.reduce((config, channelId) => {
		if (channelId === 'telegram') {
			config.telegram = {
				token: '',
				allowFrom: [],
				enabled: false,
				defaultAccountId: 'default',
				dmPolicy: 'allowlist',
			};
			return config;
		}
		if (channelId === 'discord') {
			config.discord = {
				token: '',
				allowFrom: [],
				enabled: false,
				defaultAccountId: 'default',
				dmPolicy: 'allowlist',
			};
			return config;
		}
		if (channelId === 'whatsapp') {
			config.whatsapp = {
				phoneNumber: '',
				token: '',
				enabled: false,
				defaultAccountId: 'default',
				dmPolicy: 'allowlist',
			};
			return config;
		}
		config[channelId] = {
			enabled: false,
			defaultAccountId: 'default',
			accounts: {
				default: {
					label: `${channelId} default`,
					enabled: false,
					token: '',
					allowFrom: [],
					groupAllowFrom: [],
					dmPolicy: 'allowlist',
				},
			},
		};
		return config;
	}, {} as Channel);
}

describe('ChannelsPage', () => {
	const saveChannelConfig = jest.fn();

	beforeEach(() => {
		saveChannelConfig.mockReset();
		saveChannelConfig.mockImplementation(
			async (_type: ChannelType, config: Channel[ChannelType]) => config
		);

		window.channels = {
			listCatalog: jest.fn(async () => [...listChannelCatalog()]),
			getConfig: jest.fn(async () => createChannelConfig()),
			getChannelConfig: jest.fn(),
			saveChannelConfig,
			getStatus: jest.fn(async () => undefined),
			getTelegramConfig: jest.fn(),
			saveTelegramConfig: jest.fn(),
			getTelegramStatus: jest.fn(),
			startTelegram: jest.fn(),
			stopTelegram: jest.fn(),
			restartTelegram: jest.fn(),
			onStatusChanged: jest.fn(() => jest.fn()),
		};
	});

	it('loads all channel cards and saves a generic provider configuration', async () => {
		const user = userEvent.setup();
		render(<ChannelsPage />);

		expect(await screen.findByRole('button', { name: /Slack/ })).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /Slack/ }));
		await user.type(screen.getByLabelText('Token'), 'xoxb-token');
		await user.click(screen.getByRole('button', { name: 'Save' }));

		await waitFor(() => {
			expect(saveChannelConfig).toHaveBeenCalledWith(
				'slack',
				expect.objectContaining({
					accounts: expect.objectContaining({
						default: expect.objectContaining({ token: 'xoxb-token' }),
					}),
				})
			);
		});
	});
});
