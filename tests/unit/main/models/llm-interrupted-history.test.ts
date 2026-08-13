import {
	llmBuildChatMessages,
	llmToTranscriptEntry,
} from '../../../../src/main/models/adapters/llm/llm_shared';

it('does not send an empty interrupted assistant message to OpenAI chat', () => {
	const transcript = [
		...llmToTranscriptEntry({ role: 'user', content: 'first request' }),
		...llmToTranscriptEntry({ role: 'assistant', content: [{ type: 'text', text: '' }] }),
		...llmToTranscriptEntry({ role: 'user', content: 'retry request' }),
	];

	expect(llmBuildChatMessages('', transcript)).toEqual([
		{ role: 'user', content: 'first request' },
		{ role: 'user', content: 'retry request' },
	]);
});
