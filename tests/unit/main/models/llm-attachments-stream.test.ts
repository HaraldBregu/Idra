import { LlmModel } from '../../../../src/main/models/adapters/llm/llm_model';
import type { LlmRequest } from '../../../../src/main/models/adapters/llm/llm_types';

const request = (providerId: string): LlmRequest => ({
	provider: { id: providerId, apiKey: 'key' },
	model: 'model',
	messages: [
		{
			role: 'user',
			content: [
				{
					type: 'document',
					name: 'brief.pdf',
					mimeType: 'application/pdf',
					base64: 'cGRm',
				},
			],
		},
	],
	maxTokens: 100,
	streaming: true,
});

function emptyStream(): AsyncIterable<never> {
	return {
		[Symbol.asyncIterator]: () => ({
			next: async () => ({ done: true, value: undefined as never }),
		}),
	};
}

describe('LLM streaming attachment payloads', () => {
	it('uses the targeted Reka PDF payload for streaming requests', async () => {
		const create = jest.fn().mockResolvedValue(emptyStream());
		const model = new LlmModel({
			openAIClientFactory: () => ({ chat: { completions: { create } } }) as never,
		});
		for await (const _event of model.stream(request('reka'))) {
			// Consume the provider stream.
		}

		expect(create).toHaveBeenCalledWith(
			expect.objectContaining({
				stream: true,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'pdf_url',
								pdf_url: { url: 'data:application/pdf;base64,cGRm' },
							},
						],
					},
				],
			}),
			expect.objectContaining({ signal: undefined })
		);
	});

	it('rejects generic chat PDF blocks before a streaming network request', async () => {
		const create = jest.fn();
		const model = new LlmModel({
			openAIClientFactory: () => ({ chat: { completions: { create } } }) as never,
		});

		await expect(async () => {
			for await (const _event of model.stream(request('compatible'))) {
				// Consume the provider stream.
			}
		}).rejects.toThrow('brief.pdf: this chat adapter does not support document attachments.');
		expect(create).not.toHaveBeenCalled();
	});
});
