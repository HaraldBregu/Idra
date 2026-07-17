import { parseGoalCommand } from '../../../src/renderer/src/pages/home/hooks/commands';

jest.mock('@/i18n', () => ({ default: { t: jest.fn() } }));

describe('parseGoalCommand', () => {
	it('recognizes status and lifecycle forms as goal commands', () => {
		expect(parseGoalCommand('/goal')).toBe('');
		expect(parseGoalCommand('/goal pause')).toBe('pause');
		expect(parseGoalCommand('/goal resume')).toBe('resume');
		expect(parseGoalCommand('/goal clear')).toBe('clear');
	});

	it('returns the objective and ignores unrelated prompts', () => {
		expect(parseGoalCommand('/goal Keep tests green')).toBe('Keep tests green');
		expect(parseGoalCommand('goal Keep tests green')).toBeUndefined();
	});
});
