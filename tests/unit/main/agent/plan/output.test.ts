import { isPlanOutputValid } from '../../../../../src/main/agent/plan/output';

describe('Plan output validation', () => {
	it('accepts one non-empty proposed plan envelope', () => {
		expect(isPlanOutputValid('  <proposed_plan>\nImplement it.\n</proposed_plan>  ')).toBe(true);
	});

	it.each([
		'',
		'Implement it.',
		'<proposed_plan></proposed_plan>',
		'before <proposed_plan>Implement it.</proposed_plan>',
		'<proposed_plan>Implement it.</proposed_plan> after',
		'<proposed_plan>One</proposed_plan><proposed_plan>Two</proposed_plan>',
	])('rejects an invalid response: %s', (content) => {
		expect(isPlanOutputValid(content)).toBe(false);
	});
});
