import { render, screen } from '@testing-library/react';
import {
	getAgentSkillUsages,
	type AgentMessage,
} from '../../../../../src/renderer/src/pages/home/context';
import { AgentTextMessage } from '../../../../../src/renderer/src/pages/home/components/AgentTextMessage';

describe('agent skill usage', () => {
	it('extracts skill usage from execute_skill input and result payloads', () => {
		const usages = getAgentSkillUsages([
			{
				toolCallId: 'tool-1',
				type: 'execute_skill',
				state: 'output-available',
				input: { skillId: 'research-brief' },
				output: { usedSkills: ['research-brief@1.0.0', 'summary-helper@0.2.0'] },
				outputText: '',
			},
			{
				toolCallId: 'tool-2',
				type: 'read_file',
				state: 'output-available',
				input: { path: 'README.md' },
			},
			{
				toolCallId: 'tool-3',
				type: 'execute_skill',
				state: 'output-available',
				input: { skillId: 'data-quality-check', version: '1.0.0' },
				outputText: JSON.stringify({ usedSkills: ['data-quality-check@1.0.0'] }),
			},
		]);

		expect(usages).toEqual([
			{ id: 'research-brief', label: 'research-brief' },
			{ id: 'research-brief', version: '1.0.0', label: 'research-brief@1.0.0' },
			{ id: 'summary-helper', version: '0.2.0', label: 'summary-helper@0.2.0' },
			{ id: 'data-quality-check', version: '1.0.0', label: 'data-quality-check@1.0.0' },
		]);
	});

	it('renders used skills below the assistant message', () => {
		const message: AgentMessage = {
			id: 'agent-1',
			role: 'agent',
			type: 'agent',
			content: 'Done.',
			state: 'completed',
			tools: [
				{
					toolCallId: 'tool-1',
					type: 'execute_skill',
					state: 'output-available',
					input: { skillId: 'release-notes-drafter' },
				},
			],
		};

		render(<AgentTextMessage message={message} />);

		expect(screen.getByLabelText('Skill used')).toBeInTheDocument();
		expect(screen.getByText('release-notes-drafter')).toBeInTheDocument();
	});
});
