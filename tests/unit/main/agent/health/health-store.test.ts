jest.mock('../../../../../src/main/shared/user_data_location', () => ({
	userDataLocation: () => '/tmp/friday-health-test',
}));

import {
	getHealthSettings,
	resetHealthSettings,
	updateHealthSettings,
} from '../../../../../src/main/agent/health/health_store';

it('persists and resets health settings independently', () => {
	updateHealthSettings({ every: '1h' });
	expect(getHealthSettings().every).toBe('1h');
	expect(resetHealthSettings().every).toBe('30m');
});
