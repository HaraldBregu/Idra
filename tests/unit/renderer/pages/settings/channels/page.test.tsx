import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
	CHANNEL_BUNDLED_RUNTIME_IDS,
	CHANNEL_CATALOG_BY_ID,
	CHANNEL_CATALOG_ONLY_RUNTIME_IDS,
	CHANNEL_HIDDEN_CATALOG_IDS,
	listChannelCatalog,
	type ChannelCatalogEntry,
	type ChannelType,
} from '../../../../../../src/shared/channels';
import ChannelsPage from '../../../../../../src/renderer/src/pages/settings/pages/channels/Page';

jest.mock('../../../../../../src/renderer/src/pages/settings/pages/channels/ChannelIcon', () => ({
	ChannelIcon: ({ name }: { readonly name: string }) => <span aria-hidden="true">{name}</span>,
}));

jest.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string) => {
			const translations: Record<string, string> = {
				'channels.status.connected': 'Connected',
				'settings.channels.configOnly': 'Configuration only',
			};
			return translations[key] ?? key;
		},
	}),
}));

function LocationProbe(): React.JSX.Element {
	const location = useLocation();
	return <div data-testid="location">{location.pathname}</div>;
}

function renderChannelsPage(): void {
	render(
		<MemoryRouter initialEntries={['/settings/channels']}>
			<ChannelsPage />
			<LocationProbe />
		</MemoryRouter>
	);
}

const runtimeEntry = findCatalogEntry(CHANNEL_BUNDLED_RUNTIME_IDS, (entry) => entry.catalogVisible);
const configOnlyEntry = findCatalogEntry(
	CHANNEL_CATALOG_ONLY_RUNTIME_IDS,
	(entry) => entry.catalogVisible
);
const hiddenEntry = findCatalogEntry(CHANNEL_HIDDEN_CATALOG_IDS);

describe('ChannelsPage', () => {
	beforeEach(() => {
		window.channels = {
			listCatalog: jest.fn(async () => [...listChannelCatalog()]),
			getConfig: jest.fn(),
			getChannelConfig: jest.fn(),
			saveChannelConfig: jest.fn(),
			getStatus: jest.fn(async () => ({ type: runtimeEntry.id, status: 'connected' })),
			getTelegramConfig: jest.fn(),
			saveTelegramConfig: jest.fn(),
			getTelegramStatus: jest.fn(),
			startTelegram: jest.fn(),
			stopTelegram: jest.fn(),
			restartTelegram: jest.fn(),
			onStatusChanged: jest.fn(() => jest.fn()),
		};
	});

	it('loads channel cards with runtime and configuration-only statuses', async () => {
		renderChannelsPage();

		expect(
			await screen.findByRole('button', { name: new RegExp(runtimeEntry.label) })
		).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: new RegExp(configOnlyEntry.label) })
		).toBeInTheDocument();
		expect(screen.getByText('Connected')).toBeInTheDocument();
		expect(screen.getAllByText('Configuration only').length).toBeGreaterThan(0);
		expect(
			screen.queryByRole('button', { name: new RegExp(hiddenEntry.label) })
		).not.toBeInTheDocument();
	});

	it('navigates to channel details when a channel is selected', async () => {
		const user = userEvent.setup();
		renderChannelsPage();

		await user.click(
			await screen.findByRole('button', { name: new RegExp(configOnlyEntry.label) })
		);

		expect(screen.getByTestId('location')).toHaveTextContent(
			`/settings/channels/channelDetail/${configOnlyEntry.id}`
		);
	});
});

function findCatalogEntry(
	ids: readonly ChannelType[],
	predicate: (entry: ChannelCatalogEntry) => boolean = () => true
): ChannelCatalogEntry {
	const entry = ids.map((id) => CHANNEL_CATALOG_BY_ID[id]).find(predicate);
	if (!entry) throw new Error('Expected channel catalog entry for renderer channel test.');
	return entry;
}
