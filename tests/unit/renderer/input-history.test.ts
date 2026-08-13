import type { AgentHistoryMessage } from '../../../src/shared/agent_types';
import { historyToChatMessages } from '../../../src/renderer/src/pages/home/context';

it('restores an unresolved structured input call as interrupted', () => {
	const history: AgentHistoryMessage[] = [
		{
			role: 'assistant',
			content: '',
			contentBlocks: [
				{
					type: 'tool_use',
					toolUseId: 'question',
					toolName: 'request_user_input',
					toolArgs: {
						questions: [
							{
								id: 'scope',
								header: 'Scope',
								question: 'Which scope?',
								options: [],
							},
						],
					},
				},
			],
		},
	];
	const message = historyToChatMessages(history)[0];
	expect(message?.role).toBe('agent');
	if (!message || message.role !== 'agent') throw new Error('Expected restored assistant.');
	expect(message.tools[0]).toMatchObject({
		type: 'request_user_input',
		state: 'output-error',
		output: { status: 'interrupted', answers: [] },
	});
});
