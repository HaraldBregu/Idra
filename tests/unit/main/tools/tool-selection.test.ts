import { selectAgentToolsForTurn, type AgentTool } from '../../../../src/main/capabilities/tools';
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
				tool(
					'google_calendar_search_events',
					'Google Calendar: Search Google Calendar events by text and time range.'
				),
			],
			'show my calendar events tomorrow',
			makeToolContext(),
			{ maxPromptTools: 2 }
		);

		expect(selection.toolsForPrompt.map((entry) => entry.name)).toEqual([
			'google_calendar_search_events',
		]);
	});

	it('selects the subagent tool for delegation prompts', () => {
		const selection = selectAgentToolsForTurn(
			[
				tool('read_file', 'Read workspace files.'),
				tool('spawn_subagent', 'Start a child agent run for a clearly scoped task.'),
			],
			'split the work and delegate the session storage review to a subagent',
			makeToolContext(),
			{ maxPromptTools: 1 }
		);

		expect(selection.toolsForPrompt.map((entry) => entry.name)).toEqual(['spawn_subagent']);
	});
});
