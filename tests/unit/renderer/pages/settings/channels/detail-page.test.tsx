import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Channel } from '../../../../../../src/shared/channels';
import { listChannelCatalog } from '../../../../../../src/shared/channel-catalog';
import ChannelDetailPage from '../../../../../../src/renderer/src/pages/settings/pages/channels/detail/Page';

jest.mock('../../../../../../src/renderer/src/pages/settings/pages/channels/ChannelIcon', () => ({
	ChannelIcon: ({ name }: { readonly name: string }) => <span aria-hidden="true">{name}</span>,
}));

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'settings.channels.configuration': 'Configuration',
				'settings.channels.runtimeUnavailable': 'Configuration only',
				'settings.channels.enabled': 'Enabled',
				'settings.channels.disabled': 'Disabled',
				'settings.channels.accountLabel': 'Account label',
				'settings.channels.username': 'Username',
				'settings.channels.botUserId': 'Bot user ID',
				'settings.channels.token': 'Token',
				'settings.channels.secret': 'Secret',
				'settings.channels.appId': 'App ID',
				'settings.channels.clientId': 'Client ID',
				'settings.channels.clientSecret': 'Client secret',
				'settings.channels.serverUrl': 'Server URL',
				'settings.channels.webhookUrl': 'Webhook URL',
				'settings.channels.defaultTarget': 'Default target',
				'settings.channels.dmPolicy': 'DM policy',
				'settings.channels.allowFrom': 'Allowed senders',
				'settings.channels.groupAllowFrom': 'Allowed group routes',
				'settings.channels.status': 'Status',
				'settings.channels.noAllowFrom': 'No senders',
				'settings.channels.noGroupAllowFrom': 'No groups',
				'common.close': 'Close',
			};
			return translations[key] ?? key;
		},
	}),
}));

function renderChannelDetailPage(path = '/settings/channels/channelDetail/slack'): void {
	render(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route path="/settings/channels/channelDetail/:channelId" element={<ChannelDetailPage />} />
			</Routes>
		</MemoryRouter>
	);
}

function createChannelConfig(): Channel {
	const config: Record<string, unknown> = {};
	for (const entry of listChannelCatalog()) {
		config[entry.id] = {
			enabled: false,
			defaultAccountId: 'default',
			accounts: {
				default: {
					label: `${entry.id} default`,
					enabled: false,
					token: '',
					allowFrom: [],
					groupAllowFrom: [],
					dmPolicy: 'allowlist',
				},
			},
		};
	}

	config.telegram = {
		token: '',
		allowFrom: [],
		enabled: false,
		defaultAccountId: 'default',
		dmPolicy: 'allowlist',
		groupAllowFrom: [],
	};
	config.discord = {
		token: '',
		allowFrom: [],
		enabled: false,
		defaultAccountId: 'default',
		dmPolicy: 'allowlist',
		groupAllowFrom: [],
	};
	config.whatsapp = {
		phoneNumber: '',
		token: '',
		enabled: false,
		defaultAccountId: 'default',
		dmPolicy: 'allowlist',
		allowFrom: [],
		groupAllowFrom: [],
	};

	return config as Channel;
}

describe('ChannelDetailPage', () => {
	beforeEach(() => {
		window.app = {
			...window.app,
			openExternalUrl: jest.fn(async () => undefined),
		};
		window.channels = {
			listCatalog: jest.fn(async () => [...listChannelCatalog()]),
			getConfig: jest.fn(async () => createChannelConfig()),
			getChannelConfig: jest.fn(),
			saveChannelConfig: jest.fn(),
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

	it('opens the selected channel docs from the catalog docs path', async () => {
		const user = userEvent.setup();
		renderChannelDetailPage();

		await screen.findByRole('heading', { name: 'Slack' });
		await user.click(screen.getByRole('button', { name: 'Slack setup' }));

		await waitFor(() => {
			expect(window.app.openExternalUrl).toHaveBeenCalledWith(
				'https://github.com/HaraldBregu/friday/blob/main/docs/channels/slack.md'
			);
		});
	});
});
