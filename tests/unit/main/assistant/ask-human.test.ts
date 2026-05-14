import { AskHumanTool } from '../../../../src/main/assistant/tools/ask-human';

describe('AskHumanTool', () => {
	it('declares kind="input" so the agent loop intercepts execution', () => {
		const tool = new AskHumanTool();
		expect(tool.kind).toBe('input');
	});

	it('does not require approval (input tools bypass the approval gate)', () => {
		const tool = new AskHumanTool();
		expect(tool.needsApproval({})).toBe(false);
	});

	it('execute() is a no-op sentinel returning empty string', async () => {
		const tool = new AskHumanTool();
		await expect(tool.execute({})).resolves.toBe('');
	});

	it('advertises the question + suggestions parameters', () => {
		const tool = new AskHumanTool();
		const props = tool.parameters as {
			properties: { question: object; suggestions: object };
			required: string[];
		};
		expect(props.properties.question).toBeDefined();
		expect(props.properties.suggestions).toBeDefined();
		expect(props.required).toContain('question');
	});
});
