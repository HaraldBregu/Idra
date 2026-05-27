import { selectAgentToolsForTurn, type AgentTool } from '../../../../src/main/agent/tools';
import { makeToolContext } from '../test-helpers';

function tool(name: string, description: string): AgentTool {
	return {
		name,
		description,
		schema: { type: 'object', properties: {}, additionalProperties: false },
		execute: jest.fn(),
	};
}

describe('agent tool selection', () => {
	it('handles an empty tool surface', () => {
		expect(selectAgentToolsForTurn([], 'read package.json', makeToolContext())).toEqual({
			toolsForPrompt: [],
			systemPromptSuffix: '',
			rankedTools: [],
		});
	});

	it('does not select file write tools for plain prose writing', () => {
		const selection = selectAgentToolsForTurn(
			[tool('write', 'Create or overwrite workspace files.')],
			'write a short poem about spring',
			makeToolContext()
		);

		expect(selection.toolsForPrompt).toEqual([]);
	});

	it('selects relevant tools from prompt and tool metadata', () => {
		const selection = selectAgentToolsForTurn(
			[
				tool('read', 'Read workspace files.'),
				tool('write', 'Create or overwrite workspace files.'),
				tool('google_calendar_search_events', 'Google Calendar: Search Google Calendar events by text and time range.'),
			],
			'show my calendar events tomorrow',
			makeToolContext(),
			{ maxPromptTools: 2 }
		);

		expect(selection.toolsForPrompt.map((entry) => entry.name)).toEqual(['google_calendar_search_events']);
	});
});
