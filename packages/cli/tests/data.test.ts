import assert from 'node:assert/strict';
import test from 'node:test';
import { fridayDataDirectory } from '../src/data.js';

test('resolves the Electron userData location on each platform', () => {
	assert.equal(
		fridayDataDirectory({ platform: 'darwin', home: '/Users/ada', env: {} }),
		'/Users/ada/Library/Application Support/Friday'
	);
	assert.equal(
		fridayDataDirectory({
			platform: 'win32',
			home: 'C:\\Users\\Ada',
			env: { APPDATA: 'C:\\Users\\Ada\\AppData\\Roaming' },
		}),
		'C:\\Users\\Ada\\AppData\\Roaming/Friday'
	);
	assert.equal(
		fridayDataDirectory({
			platform: 'linux',
			home: '/home/ada',
			env: { XDG_CONFIG_HOME: '/tmp/config' },
		}),
		'/tmp/config/Friday'
	);
});
