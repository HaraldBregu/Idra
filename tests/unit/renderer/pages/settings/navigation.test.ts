import {
	SETTINGS_NAVIGATION,
	SETTINGS_OPERATOR_ITEMS,
} from '../../../../../src/renderer/src/pages/settings/navigation';

describe('settings navigation', () => {
	it('keeps the overview list in the requested order', () => {
		expect(SETTINGS_NAVIGATION.map((item) => item.labelKey)).toEqual([
			'settings.tabs.general',
			'settings.tabs.system',
			'settings.tabs.providers',
			'settings.tabs.tools',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.tabs.channels',
			'settings.tabs.heartbeat',
			'settings.sections.taskScheduler',
			'settings.tabs.backgroundTasks',
			'settings.tabs.monitoring',
			'settings.tabs.policies',
		]);
	});

	it('keeps operator rows available for the settings overview', () => {
		expect(SETTINGS_OPERATOR_ITEMS.map((item) => item.labelKey)).toEqual([
			'settings.operators.assistantName',
			'settings.operators.speechTranscriberName',
			'settings.operators.textToSpeechName',
			'settings.operators.imageAssistantName',
			'settings.operators.videoCreatorName',
			'settings.operators.musicCreatorName',
		]);
	});
});
