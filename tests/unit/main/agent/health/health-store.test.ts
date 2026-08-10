jest.mock('../../../../../src/main/shared/user_data_location', () => ({
	userDataLocation: () => '/tmp/friday-health-test',
}));

import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/permissions/permissions_types';
import {
	getHealthPermissions,
	getHealthSettings,
	resetHealthPermissions,
	resetHealthSettings,
	saveHealthPermissions,
	updateHealthSettings,
} from '../../../../../src/main/agent/health/health_store';

it('keeps health permissions independent from settings updates and resets', () => {
	const initial = getHealthPermissions();
	expect(initial).toMatchObject({ mode: 'ask', dir: {} });
	saveHealthPermissions({
		...DEFAULT_PERMISSIONS,
		read: { default: 'deny', allow: [], deny: [], ask: [] },
	});
	updateHealthSettings({ every: '1h' });
	expect(getHealthPermissions().read).toMatchObject({ default: 'deny' });
	expect(getHealthSettings().every).toBe('1h');

	resetHealthSettings();
	expect(getHealthSettings().every).toBe('30m');
	expect(getHealthPermissions().read).toMatchObject({ default: 'deny' });

	resetHealthPermissions();
	expect(getHealthPermissions().read).toMatchObject({ default: 'allow' });
});
