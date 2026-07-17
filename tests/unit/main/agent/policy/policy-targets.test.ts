import path from 'node:path';
import { toolTargetDirs } from '../../../../../src/main/agent/policy/policy_targets';
import { resolveUserPath } from '../../../../../src/main/shared/user_path';

const agentDir = path.resolve('/appdata/agent');

describe('toolTargetDirs', () => {
	it('extracts dirs from apply_patch add/update/delete headers', () => {
		const input = [
			'*** Begin Patch',
			'*** Add File: src/a.ts',
			'*** Update File: lib/b.ts',
			'*** End Patch',
		].join('\n');
		const dirs = toolTargetDirs('apply_patch', { input }, agentDir);
		expect(dirs).toEqual([
			path.dirname(resolveUserPath('src/a.ts', agentDir)),
			path.dirname(resolveUserPath('lib/b.ts', agentDir)),
		]);
	});

	it('includes move-to targets in apply_patch', () => {
		const input = '*** Update File: a.ts\n*** Move to: dir/b.ts';
		const dirs = toolTargetDirs('apply_patch', { input }, agentDir);
		expect(dirs).toContain(path.dirname(resolveUserPath('dir/b.ts', agentDir)));
	});

	it('extracts whitespace-prefixed patch headers like the patch parser', () => {
		const input = '  *** Update File: outside/a.ts\n\t*** Move to: outside/b.ts';
		expect(toolTargetDirs('apply_patch', { input }, agentDir)).toEqual([
			path.dirname(resolveUserPath('outside/a.ts', agentDir)),
			path.dirname(resolveUserPath('outside/b.ts', agentDir)),
		]);
	});

	it('returns [] for apply_patch without string input', () => {
		expect(toolTargetDirs('apply_patch', {}, agentDir)).toEqual([]);
	});

	it('resolves the exec workdir, defaulting to cwd', () => {
		expect(toolTargetDirs('exec', { workdir: '/work' }, agentDir)).toEqual([
			resolveUserPath('/work', agentDir),
		]);
		expect(toolTargetDirs('exec', {}, agentDir)).toEqual([
			resolveUserPath('.', agentDir),
		]);
	});

	it('falls back to the tool path dir for other tools', () => {
		expect(toolTargetDirs('write', { path: '/a/b.txt' }, agentDir)).toEqual([
			path.dirname(resolveUserPath('/a/b.txt', agentDir)),
		]);
		expect(toolTargetDirs('write', {}, agentDir)).toEqual([]);
	});
});
