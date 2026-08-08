import {
	fitModelContext,
	type ModelContextBudgetInput,
} from '../../../../../src/main/agent/run/run_model_context_budget';
import { jsonTool } from '../../../../../src/main/agent/tools/tool';

const makeTool = (name: string, description = name) =>
	jsonTool({
		name,
		description,
		schema: { type: 'object', properties: { value: { type: 'string' } } },
		execute: () => undefined,
	});

describe('fitModelContext', () => {
	it('preserves the current user turn and summarizes oversized tool results before old turns', () => {
		const result = fitModelContext({
			systemPrompt: 'System safety rules.',
			messages: [
				{ role: 'user', content: `old request ${'x'.repeat(8_000)}` },
				{ role: 'assistant', content: 'old answer' },
				{ role: 'user', content: 'current request must remain' },
				{
					role: 'assistant',
					content: '',
					toolCalls: [
						{
							id: 'call-1',
							name: 'read',
							args: { path: 'large.txt' },
							result: { content: 'result'.repeat(2_000) },
						},
					],
				},
			],
			tools: [makeTool('read')],
			maxInputTokens: 900,
		});

		expect(JSON.stringify(result.messages)).toContain('current request must remain');
		expect(JSON.stringify(result.messages)).toContain('tool result omitted');
		expect(JSON.stringify(result.messages)).not.toContain('old request');
		expect(result.estimatedTokens).toBeLessThanOrEqual(900);
	});

	it('sends only the exact tool schemas that fit the remaining budget', () => {
		const input: ModelContextBudgetInput = {
			systemPrompt: 'System rules.',
			messages: [{ role: 'user', content: 'Use an available tool.' }],
			tools: [
				makeTool('first', 'a'.repeat(700)),
				makeTool('second', 'b'.repeat(700)),
				makeTool('third', 'c'.repeat(700)),
			],
			maxInputTokens: 420,
		};

		const result = fitModelContext(input);

		expect(result.tools.map((tool) => tool.name)).toEqual(['first']);
		expect(result.estimatedTokens).toBeLessThanOrEqual(input.maxInputTokens);
	});

	it('keeps current text while replacing an attachment payload that cannot fit', () => {
		const result = fitModelContext({
			systemPrompt: 'System rules.',
			messages: [
				{
					role: 'user',
					content: [
						{ type: 'text', text: 'Inspect this attachment.' },
						{
							type: 'file',
							name: 'large.pdf',
							mimeType: 'application/pdf',
							base64: 'a'.repeat(8_000),
						},
					],
				},
			],
			tools: [],
			maxInputTokens: 700,
		});

		expect(JSON.stringify(result.messages)).toContain('Inspect this attachment.');
		expect(JSON.stringify(result.messages)).toContain('attachment payload omitted');
		expect(JSON.stringify(result.messages)).not.toContain('a'.repeat(100));
		expect(result.estimatedTokens).toBeLessThanOrEqual(700);
	});

	it('fails instead of silently truncating oversized current text', () => {
		expect(() =>
			fitModelContext({
				systemPrompt: 'System rules.',
				messages: [{ role: 'user', content: 'x'.repeat(10_000) }],
				tools: [],
				maxInputTokens: 500,
			})
		).toThrow('current user turn');
	});
});
