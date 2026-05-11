import { app } from 'electron';
import { getDefaultDataDirectory } from '../../../../src/main/utils';

describe('getDefaultDataDirectory', () => {
	it('resolves to a home-based app data directory', () => {
		const result = getDefaultDataDirectory('assistant', 'sessions');

		expect(app.getPath).toHaveBeenCalledWith('home');
		expect(result).toBe('/tmp/friday-test/home/FridayData/assistant/sessions');
	});
});
