import type { AgentTool } from '../tools';
import { textResult } from '../tools';
import type { SubagentSpawnPort } from './spawn-service';

export function createSessionsSpawnTool(spawnService: SubagentSpawnPort): AgentTool {
	return {
		name: 'sessions_spawn',
		description: 'Spawn a subagent session.',
		schema: { type: 'object', required: ['requesterSessionKey', 'task'], properties: { requesterSessionKey: { type: 'string' }, task: { type: 'string' } } },
		async execute(args) {
			return textResult(JSON.stringify(await spawnService.spawn(args as never), null, 2));
		},
	};
}
