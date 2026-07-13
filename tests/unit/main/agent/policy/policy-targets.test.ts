import path from 'node:path';
import { toolTargetDirs } from '../../../../../src/main/agent/policy/policy_targets';
import { resolveUserPath } from '../../../../../src/main/agent/policy/policy_path';

describe('toolTargetDirs', () => {
	it('extracts dirs from apply_patch add/update/delete headers', () => {
		const input = [
			'*** Begin Patch',
			'*** Add File: src/a.ts',
			'*** Update File: lib/b.ts',
			'*** End Patch',
		].join('\n');
		const dirs = toolTargetDirs('apply_patch', { input });
		expect(dirs).toEqual([
			path.dirname(resolveUserPath('src/a.ts')),
			path.dirname(resolveUserPath('lib/b.ts')),
		]);
	});

	it('includes move-to targets in apply_patch', () => {
		const input = '*** Update File: a.ts\n*** Move to: dir/b.ts';
		const dirs = toolTargetDirs('apply_patch', { input });
		expect(dirs).toContain(path.dirname(resolveUserPath('dir/b.ts')));
	});

	it('returns [] for apply_patch without string input', () => {
		expect(toolTargetDirs('apply_patch', {})).toEqual([]);
	});

	it('resolves the exec workdir, defaulting to cwd', () => {
		expect(toolTargetDirs('exec', { workdir: '/work' })).toEqual([resolveUserPath('/work')]);
		expect(toolTargetDirs('exec', {})).toEqual([resolveUserPath('.')]);
	});

	it('falls back to the tool path dir for other tools', () => {
		expect(toolTargetDirs('write', { path: '/a/b.txt' })).toEqual([
			path.dirname(resolveUserPath('/a/b.txt')),
		]);
		expect(toolTargetDirs('write', {})).toEqual([]);
	});
});
