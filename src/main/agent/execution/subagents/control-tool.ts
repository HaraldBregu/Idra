import type { AgentTool } from '../tools';
import { textResult } from '../tools';
import type { SubagentSpawnPort } from './spawn-service';

export function createSubagentsControlTool(subagents: SubagentSpawnPort): AgentTool {
	return {
		name: 'subagents_control',
		description: 'List or cancel subagent runs.',
		schema: { type: 'object', required: ['requesterSessionKey', 'action'], properties: { requesterSessionKey: { type: 'string' }, action: { type: 'string' }, runId: { type: 'string' } } },
		async execute(args) {
			return textResult(JSON.stringify(await subagents.control(args as never), null, 2));
		},
	};
}
