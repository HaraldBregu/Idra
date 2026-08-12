import { addPlanPrompt } from '../../../../../src/main/agent/system/system_add_plan_prompt';

describe('Plan protected prompt', () => {
	it('appends the read-only and final-envelope contract after the normal prompt', () => {
		const prompt = addPlanPrompt('normal prompt');
		expect(prompt.startsWith('normal prompt')).toBe(true);
		expect(prompt).toContain('Do not modify user, workspace, application, or external state.');
		expect(prompt).toContain('<proposed_plan>…</proposed_plan>');
	});
});
