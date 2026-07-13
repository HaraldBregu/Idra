import path from 'node:path';

const getPath = jest.fn();
const getName = jest.fn(() => 'Friday');

jest.mock('electron', () => ({
	app: {
		get getPath() {
			return getPath;
		},
		getName,
	},
}));

import { userDataLocation } from '../../../../src/main/shared/user_data_location';

describe('userDataLocation', () => {
	const env = { ...process.env };
	beforeEach(() => {
		getPath.mockReset();
		getName.mockReturnValue('Friday');
		delete process.env.APPDATA;
		delete process.env.XDG_CONFIG_HOME;
	});
	afterEach(() => {
		process.env = { ...env };
	});

	it('returns the electron userData path when available', () => {
		getPath.mockReturnValue('/user/data');
		expect(userDataLocation()).toBe('/user/data');
		expect(getPath).toHaveBeenCalledWith('userData');
	});

	it('falls back to APPDATA + app name when electron throws', () => {
		getPath.mockImplementation(() => {
			throw new Error('app not ready');
		});
		process.env.APPDATA = '/appdata';
		expect(userDataLocation()).toBe(path.resolve('/appdata', 'Friday'));
	});

	it('falls back to HOME when APPDATA/XDG absent', () => {
		getPath.mockImplementation(() => {
			throw new Error('app not ready');
		});
		process.env.HOME = '/home/me';
		expect(userDataLocation()).toBe(path.resolve('/home/me', 'Friday'));
	});
});
