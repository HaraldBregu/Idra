import type { AgentMessage } from '../../../../../src/renderer/src/pages/home/context';
import { agentStatusLabel } from '../../../../../src/renderer/src/pages/home/components/agent-status';

function agentMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
	return {
		id: 'agent-1',
		role: 'agent',
		type: 'agent',
		content: 'Done',
		state: 'completed',
		tools: [],
		...overrides,
	};
}

describe('agent status labels', () => {
	it('uses elapsed thinking time for completed direct responses', () => {
		expect(
			agentStatusLabel(
				agentMessage({
					startedAtMs: 1_000,
					completedAtMs: 4_000,
				})
			)
		).toBe('Thought for 3 seconds');
	});

	it('uses elapsed finish time for completed tool responses', () => {
		expect(
			agentStatusLabel(
				agentMessage({
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
		expect(agentStatusLabel(agentMessage({ state: 'answering' }))).toBe('Answering');
	});
});
