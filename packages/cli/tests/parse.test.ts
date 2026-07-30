import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTuiCommand } from '../src/parse.js';

test('parses install and control commands', () => {
	assert.deepEqual(parseTuiCommand('/install package-one'), {
		kind: 'install',
		spec: 'package-one',
		force: false,
	});
	assert.deepEqual(parseTuiCommand('/install package-one --force'), {
		kind: 'install',
		spec: 'package-one',
		force: true,
	});
	assert.deepEqual(parseTuiCommand('/app'), { kind: 'app' });
	assert.deepEqual(parseTuiCommand('/quit'), { kind: 'quit' });
	assert.deepEqual(parseTuiCommand('/install'), { kind: 'unknown', input: '/install' });
});
