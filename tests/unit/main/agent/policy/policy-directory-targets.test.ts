import path from 'node:path';
import { directoryPermissionTargets } from '../../../../../src/main/agent/policy/policy_directory_targets';

const agentDir = path.resolve('/appdata/agent');

describe('directoryPermissionTargets', () => {
	it('uses an exec working directory instead of its command', () => {
		expect(
			directoryPermissionTargets(
				'exec',
				{ command: 'npm test', workdir: '/workspace/app' },
				agentDir
			)
		).toEqual([path.resolve('/workspace/app')]);
	});

	it('uses the agent directory for exec without an explicit working directory', () => {
		expect(directoryPermissionTargets('exec', { command: 'npm test' }, agentDir)).toEqual([
			agentDir,
		]);
	});

	it('does not create an exec target without a command', () => {
		expect(directoryPermissionTargets('exec', { workdir: '/workspace/app' }, agentDir)).toEqual([]);
	});

	it('reuses file targets for filesystem tools', () => {
		expect(directoryPermissionTargets('write', { path: '/workspace/a.txt' }, agentDir)).toEqual([
			path.resolve('/workspace/a.txt'),
		]);
	});
});
