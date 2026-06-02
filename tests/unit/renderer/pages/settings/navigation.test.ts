import {
	SETTINGS_NAVIGATION,
	SETTINGS_MODEL_SERVICE_ITEMS,
} from '../../../../../src/renderer/src/pages/settings/navigation';

describe('settings navigation', () => {
	it('keeps the overview list in the requested order', () => {
		expect(SETTINGS_NAVIGATION.map((item) => item.labelKey)).toEqual([
			'settings.tabs.general',
			'settings.tabs.system',
			'settings.tabs.providers',
			'settings.tabs.skills',
			'settings.tabs.connectors',
			'settings.tabs.channels',
			'settings.tabs.heartbeat',
			'settings.sections.taskScheduler',
		]);
	});

	it('keeps model service rows available for the settings overview', () => {
		expect(SETTINGS_MODEL_SERVICE_ITEMS.map((item) => item.labelKey)).toEqual([
			'settings.modelServices.assistantName',
			'settings.modelServices.speechTranscriberName',
			'settings.modelServices.textToSpeechName',
			'settings.modelServices.imageAssistantName',
			'settings.modelServices.videoCreatorName',
			'settings.modelServices.musicCreatorName',
		]);
	});
});
