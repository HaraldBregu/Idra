jest.mock('../../../../src/main/shared/user_data_location', () => ({
	userDataLocation: () => '/tmp/friday-user-data',
}));

import {
	channelsStorePath,
	getChannelPermissions,
	getChannelProvider,
	listChannelProviders,
	resetChannelPermissions,
	saveChannelPermissions,
	setChannelProvider,
} from '../../../../src/main/channels/channels_store';
import {
	DEFAULT_PERMISSIONS,
	PERMISSION_TOOLS,
} from '../../../../src/main/agent/permissions/permissions_types';
import type { StoredBotProvider } from '../../../../src/shared';

describe('channels store', () => {
	it('persists channel providers under settings/channels.json', () => {
		const provider: StoredBotProvider = {
			id: 'telegram',
			name: 'Telegram',
			apiKey: 'token',
			baseUrl: '',
		};

		expect(channelsStorePath).toBe('/tmp/friday-user-data/settings/channels.json');
		expect(listChannelProviders()).toEqual([]);

		setChannelProvider(provider);

		expect(getChannelProvider('telegram')).toEqual(provider);

		const initialPermissions = getChannelPermissions();
		expect(initialPermissions).toMatchObject({ mode: 'ask', dir: {} });
		for (const toolName of PERMISSION_TOOLS) {
			expect(initialPermissions[toolName]).toMatchObject({ default: 'allow' });
		}
		saveChannelPermissions({
			...DEFAULT_PERMISSIONS,
			web_search: { default: 'deny', allow: [], deny: [], ask: [] },
		});
		expect(getChannelPermissions().web_search).toMatchObject({ default: 'deny' });
		expect(getChannelProvider('telegram')).toEqual(provider);
		const resetPermissions = resetChannelPermissions();
		for (const toolName of PERMISSION_TOOLS) {
			expect(resetPermissions[toolName]).toMatchObject({ default: 'allow' });
		}
		expect(getChannelProvider('telegram')).toEqual(provider);
	});
});
