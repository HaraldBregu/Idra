import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ChannelsPage from '../../../src/renderer/src/pages/settings/pages/channels/Page';

jest.mock('react-i18next', () => {
	const translations: Record<string, string> = {
		'settings.tabs.channels': 'Channels',
		'settings.channels.description': 'Connect messaging channels.',
		'settings.channels.configured': 'Configured',
		'settings.channels.notConfigured': 'Not configured',
	};
	return { useTranslation: () => ({ t: (key: string) => translations[key] ?? key }) };
});

const channels = jest.fn();
const listProviders = jest.fn();

beforeEach(() => {
	Object.defineProperty(window, 'app', {
		configurable: true,
		value: { channels },
	});
	Object.defineProperty(window, 'provider', {
		configurable: true,
		value: { list: listProviders },
	});
	channels.mockResolvedValue([
		{
			id: 'discord-bot',
			name: 'Discord Bot API',
			type: 'bot',
			url: 'https://discord.com/api',
			provider: {
				id: 'discord',
				name: 'Discord',
				baseUrl: 'https://discord.com/api',
				iconDarkUrl: 'local-resource://discord.svg',
				iconLightUrl: 'local-resource://discord.svg',
			},
		},
	]);
	listProviders.mockResolvedValue([
		{ id: 'discord', name: 'Discord', apiKey: 'token', baseUrl: 'https://discord.com/api' },
	]);
});

it('presents channels returned by the channel catalog IPC', async () => {
	render(
		<MemoryRouter>
			<ChannelsPage />
		</MemoryRouter>
	);

	expect(await screen.findByText('Discord')).toBeInTheDocument();
	expect(screen.getByText('Discord Bot API')).toBeInTheDocument();
	expect(screen.getByText('Configured')).toBeInTheDocument();
	expect(channels).toHaveBeenCalledTimes(1);
});
