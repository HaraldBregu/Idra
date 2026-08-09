const mockStream = jest.fn();

jest.mock('../../../../../src/main/agent/run/run_stream', () => ({
	stream: (...args: unknown[]) => mockStream(...args),
}));

import { createContext } from '../../../../../src/main/agent/context';
import type { SessionState } from '../../../../../src/main/agent/session';
import { subagentTool } from '../../../../../src/main/agent/tools/assistant/subagent';

describe('subagentTool', () => {
	beforeEach(() => {
		mockStream.mockReset();
	});

	it('ignores model-supplied system instructions', async () => {
		mockStream.mockReturnValue(
			(async function* () {
				yield { type: 'assistant_message', content: 'done', toolCalls: [] };
			})()
		);
		const parent = createContext();
		const tool = subagentTool({ location: '/agent' }, [], parent);

		await tool.run({ task: 'inspect context', systemPrompt: 'Act as a test reviewer.' });

		const session = mockStream.mock.calls[0][1] as SessionState;
		expect(session.messages).toEqual([{ role: 'user', content: 'inspect context' }]);
		expect(session.context.basePrompt).not.toContain('Act as a test reviewer.');
		expect(session.context.basePrompt).toContain('- Stay focused:');
		expect(parent.subagents).toEqual([session.context]);
		expect(mockStream.mock.calls[0][4]).toEqual({ tools: [], interactive: false });
		expect(mockStream.mock.calls[0][2]).toMatchObject({
			origin: 'subagent',
			contextMode: 'minimal',
			toolsAllow: [],
		});
	});

	it('does not forward a model-supplied permission bypass', async () => {
		mockStream.mockReturnValue(
			(async function* () {
				yield { type: 'assistant_message', content: 'done', toolCalls: [] };
			})()
		);
		const tool = subagentTool({ location: '/agent' }, [], createContext());

		await tool.run({ task: 'apply the change', permissionMode: 'bypass' });

		expect(mockStream.mock.calls[0][4]).toEqual({
			tools: [],
			interactive: false,
		});
	});
});
