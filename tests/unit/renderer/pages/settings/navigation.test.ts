import { SETTINGS_NAVIGATION } from '../../../../../src/renderer/src/pages/settings/navigation';

describe('settings navigation', () => {
	it('keeps the overview list in the requested order', () => {
		expect(SETTINGS_NAVIGATION.map((item) => item.labelKey)).toEqual([
			'settings.tabs.general',
			'settings.tabs.system',
			'settings.tabs.providers',
			'settings.tabs.operators',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.tabs.channels',
			'settings.tabs.heartbeat',
			'settings.tabs.cron',
			'settings.tabs.taskManager',
			'settings.tabs.apps',
		]);
	});
});
