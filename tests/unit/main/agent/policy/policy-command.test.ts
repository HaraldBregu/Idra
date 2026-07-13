import { toolCommandName } from '../../../../../src/main/agent/policy/policy_command';

describe('toolCommandName', () => {
	it('returns the first token of a simple command', () => {
		expect(toolCommandName({ command: 'git status' })).toBe('git');
		expect(toolCommandName({ command: '  ls   -la ' })).toBe('ls');
	});
	it('returns undefined when command is not a string', () => {
		expect(toolCommandName({})).toBeUndefined();
		expect(toolCommandName({ command: 42 })).toBeUndefined();
	});
	it('refuses commands containing shell control operators', () => {
		expect(toolCommandName({ command: 'git status && rm -rf ~' })).toBeUndefined();
		expect(toolCommandName({ command: 'echo a | grep b' })).toBeUndefined();
		expect(toolCommandName({ command: 'a; b' })).toBeUndefined();
		expect(toolCommandName({ command: 'cat < file' })).toBeUndefined();
		expect(toolCommandName({ command: 'echo `whoami`' })).toBeUndefined();
		expect(toolCommandName({ command: 'echo $(id)' })).toBeUndefined();
		expect(toolCommandName({ command: 'a\nb' })).toBeUndefined();
	});
	it('returns undefined for empty command', () => {
		expect(toolCommandName({ command: '   ' })).toBeUndefined();
	});
});
