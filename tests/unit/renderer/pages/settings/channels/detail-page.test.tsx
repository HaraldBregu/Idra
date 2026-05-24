import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type {
	Channel,
	ChannelCatalogEntry,
	ChannelType,
	GenericChannelProperties,
} from '../../../../../../src/shared/channels';
import {
	CHANNEL_CATALOG_BY_ID,
	CHANNEL_CATALOG_ONLY_RUNTIME_IDS,
	CHANNEL_DEFAULT_ACCOUNT_ID,
	CHANNEL_DEFAULT_DM_POLICY,
	CHANNEL_DOCS_PATH_BY_ID,
	buildChannelDocsUrl,
	listChannelCatalog,
} from '../../../../../../src/shared/channels';
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

const detailEntry = findVisibleCatalogOnlyEntry();

function renderChannelDetailPage(
	path = `/settings/channels/channelDetail/${detailEntry.id}`
): void {
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
			defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
			accounts: {
				[CHANNEL_DEFAULT_ACCOUNT_ID]: {
					label: `${entry.id} default`,
					enabled: false,
					token: '',
					allowFrom: [],
					groupAllowFrom: [],
					dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
				},
			},
		};
	}

	config.telegram = {
		token: '',
		allowFrom: [],
		enabled: false,
		defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
		groupAllowFrom: [],
	};
	config.discord = {
		token: '',
		allowFrom: [],
		enabled: false,
		defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
		groupAllowFrom: [],
	};
	config.whatsapp = {
		phoneNumber: '',
		token: '',
		enabled: false,
		defaultAccountId: CHANNEL_DEFAULT_ACCOUNT_ID,
		dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
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
			saveChannelConfig: jest.fn(async (_channelId: ChannelType, config: Channel[ChannelType]) => config),
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
		renderChannelDetailPage(`/settings/channels/channelDetail/${detailEntry.id}`);

		await screen.findByRole('heading', { name: detailEntry.label });
		await user.click(screen.getByRole('button', { name: detailEntry.docsLabel }));

		await waitFor(() => {
			expect(window.app.openExternalUrl).toHaveBeenCalledWith(
				buildChannelDocsUrl(
					CHANNEL_DOCS_PATH_BY_ID[detailEntry.id],
					'https://github.com/HaraldBregu/friday'
				)
			);
		});
	});

	it('saves edits to the configured default account instead of a hardcoded account id', async () => {
		const user = userEvent.setup();
		const defaultAccountId = 'workspace';
		const config = createChannelConfig();
		const selectedConfig = config[detailEntry.id] as GenericChannelProperties;
		selectedConfig.defaultAccountId = defaultAccountId;
		selectedConfig.accounts = {
			[defaultAccountId]: {
				label: '',
				enabled: false,
				token: '',
				allowFrom: [],
				groupAllowFrom: [],
				dmPolicy: CHANNEL_DEFAULT_DM_POLICY,
			},
		};
		window.channels.getConfig = jest.fn(async () => config);

		renderChannelDetailPage(`/settings/channels/channelDetail/${detailEntry.id}`);

		const labelInput = await screen.findByLabelText('Account label');
		await user.type(labelInput, 'Renamed account');
		await user.tab();

		await waitFor(() => expect(window.channels.saveChannelConfig).toHaveBeenCalled());
		const savedConfig = (window.channels.saveChannelConfig as jest.Mock).mock
			.calls[0][1] as GenericChannelProperties;
		expect(savedConfig.defaultAccountId).toBe(defaultAccountId);
		expect(savedConfig.accounts?.[defaultAccountId]?.label).toBe('Renamed account');
		expect(savedConfig.accounts?.[CHANNEL_DEFAULT_ACCOUNT_ID]).toBeUndefined();
	});
});

function findVisibleCatalogOnlyEntry(): ChannelCatalogEntry {
	const entry = CHANNEL_CATALOG_ONLY_RUNTIME_IDS.map((id) => CHANNEL_CATALOG_BY_ID[id]).find(
		(item) => item.catalogVisible
	);
	if (!entry) throw new Error('Expected visible catalog-only entry for renderer channel test.');
	return entry;
}
