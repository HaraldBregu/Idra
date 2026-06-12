const storeConstructor = jest.fn(() => ({
	get: jest.fn(),
	set: jest.fn(),
}));

jest.mock('electron-store', () => ({
	__esModule: true,
	default: storeConstructor,
}));

import { SttService } from '../../../../src/main/services/stt-service';

describe('SttService storage', () => {
	it('stores speech-to-text settings in stt/settings.json', () => {
		new SttService();

		expect(storeConstructor).toHaveBeenCalledWith({
			name: 'settings',
			cwd: 'stt',
			accessPropertiesByDotNotation: false,
			defaults: {
				providerId: undefined,
				modelId: undefined,
				providers: {},
			},
		});
	});
});
