import type { AssistantMessage } from '../../../../../src/renderer/src/pages/home/context';
import { assistantStatusLabel } from '../../../../../src/renderer/src/pages/home/components/assistant-status';

function assistantMessage(overrides: Partial<AssistantMessage> = {}): AssistantMessage {
	return {
		id: 'assistant-1',
		role: 'assistant',
		type: 'assistant',
		content: 'Done',
		state: 'completed',
		tools: [],
		...overrides,
	};
}

describe('assistant status labels', () => {
	it('uses elapsed thinking time for completed direct responses', () => {
		expect(
			assistantStatusLabel(
				assistantMessage({
					startedAtMs: 1_000,
					completedAtMs: 4_000,
				})
			)
		).toBe('Thought for 3 seconds');
	});

	it('uses elapsed finish time for completed tool responses', () => {
		expect(
			assistantStatusLabel(
				assistantMessage({
					tools: [
						{
							toolCallId: 'tool-1',
							type: 'read_file',
							state: 'output-available',
						},
					],
					startedAtMs: 1_000,
					completedAtMs: 5_000,
				})
			)
		).toBe('Finished in 4 seconds');
	});

	it('does not expose direct-response wording while answering', () => {
		expect(assistantStatusLabel(assistantMessage({ state: 'answering' }))).toBe('Answering');
	});
});
