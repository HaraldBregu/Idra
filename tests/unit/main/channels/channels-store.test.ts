jest.mock('../../../../src/main/shared/user_data_location', () => ({
	userDataLocation: () => '/tmp/idra-user-data',
}));

import {
	channelsStorePath,
	getChannelProvider,
	listChannelProviders,
	setChannelProvider,
} from '../../../../src/main/channels/channels_store';
import type { StoredBotProvider } from '../../../../src/shared';

describe('channels store', () => {
	it('persists channel providers under settings/channels.json', () => {
		const provider: StoredBotProvider = {
			id: 'telegram',
			name: 'Telegram',
			apiKey: 'token',
			baseUrl: '',
		};

		expect(channelsStorePath).toBe('/tmp/idra-user-data/settings/channels.json');
		expect(listChannelProviders()).toEqual([]);

		setChannelProvider(provider);

		expect(getChannelProvider('telegram')).toEqual(provider);

		expect(getChannelProvider('telegram')).toEqual(provider);
	});
});
