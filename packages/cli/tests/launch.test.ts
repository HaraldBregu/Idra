import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLaunchTarget } from '../src/launch.js';

test('resolves platform launch targets without invoking a shell', () => {
	assert.deepEqual(resolveLaunchTarget({ platform: 'darwin', env: {} }), {
		command: 'open',
		args: ['-a', 'Friday'],
		detached: false,
	});
	assert.deepEqual(resolveLaunchTarget({ platform: 'linux', env: {} }), {
		command: 'friday-desktop',
		args: [],
		detached: true,
	});
	assert.deepEqual(
		resolveLaunchTarget({
			platform: 'win32',
			env: { LOCALAPPDATA: 'C:\\Local' },
			exists: () => true,
		}),
		{
			command: 'C:\\Local/Programs/Friday/Friday.exe',
			args: [],
			detached: true,
		}
	);
	assert.deepEqual(
		resolveLaunchTarget({
			platform: 'linux',
			env: { FRIDAY_APP_PATH: '/opt/Friday.AppImage' },
		}),
		{
			command: '/opt/Friday.AppImage',
			args: [],
			detached: true,
		}
	);
});
