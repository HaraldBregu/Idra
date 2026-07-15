import { isDestructiveCommand } from '../../../../../src/main/agent/policy/policy_exec';

describe('isDestructiveCommand', () => {
	it('lets read-only commands through', () => {
		expect(isDestructiveCommand('ls -la')).toBe(false);
		expect(isDestructiveCommand('git status')).toBe(false);
		expect(isDestructiveCommand('grep -r foo src | head')).toBe(false);
		expect(isDestructiveCommand('cat file 2>&1')).toBe(false);
		expect(isDestructiveCommand('npm test > /dev/null')).toBe(false);
	});

	it('flags deleting and rewriting commands', () => {
		expect(isDestructiveCommand('rm -rf build')).toBe(true);
		expect(isDestructiveCommand('/bin/rm file')).toBe(true);
		expect(isDestructiveCommand('mv a b')).toBe(true);
		expect(isDestructiveCommand('sudo reboot')).toBe(true);
		expect(isDestructiveCommand('FOO=1 rm x')).toBe(true);
	});

	it('flags file-changing constructs in compound commands', () => {
		expect(isDestructiveCommand('ls && rm x')).toBe(true);
		expect(isDestructiveCommand('echo hi > out.txt')).toBe(true);
		expect(isDestructiveCommand('echo hi >> notes.md')).toBe(true);
		expect(isDestructiveCommand('sed -i s/a/b/ file')).toBe(true);
		expect(isDestructiveCommand('find . -name "*.tmp" -delete')).toBe(true);
	});
});
