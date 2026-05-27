import { resolvePromptReasoningEffort } from '../../../../../src/renderer/src/pages/home/hooks/useHomeAgent';

describe('prompt reasoning effort', () => {
	it('uses no reasoning and light context for quick direct prompts', () => {
		expect(resolvePromptReasoningEffort('quick answer: what is 2 + 2?')).toEqual({
			effort: 'none',
			lightContext: true,
		});
	});

	it('uses high reasoning for debugging and code context prompts', () => {
		expect(
			resolvePromptReasoningEffort('debug this failing test in src/renderer/src/pages/home')
		).toEqual({
			effort: 'high',
			lightContext: false,
		});
	});

	it('uses medium reasoning for implementation prompts without strong debug signals', () => {
		expect(resolvePromptReasoningEffort('explain how to improve the chat labels')).toEqual({
			effort: 'medium',
			lightContext: false,
		});
	});
});
