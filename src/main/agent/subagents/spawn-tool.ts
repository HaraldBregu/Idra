import type { AgentTool, AgentToolResult, ToolContext } from '../../tools/types';
import { textResult } from '../../tools/types';
import { DEFAULT_AGENT_ID } from '../../constants';
import type { SubagentSpawnPort } from './spawn-service';
import type { SessionsSpawnInput, SessionsSpawnResult } from './types';

function spawnResult(result: SessionsSpawnResult): AgentToolResult<SessionsSpawnResult> {
	return {
		status: 'ok',
		content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		details: result,
	};
}

export function createSessionsSpawnTool(
	spawnService: SubagentSpawnPort
): AgentTool<SessionsSpawnInput> {
	return {
		name: 'sessions_spawn',
		displaySummary: 'Spawn a child agent session.',
		description:
			'Start isolated child agent work as a tracked background task. Use this to delegate a clearly scoped task to a subagent and continue the current turn without waiting for the child run to finish.',
		schema: {
			type: 'object',
			properties: {
				task: { type: 'string', description: 'The complete instruction for the child agent.' },
				taskName: { type: 'string', description: 'Short task title shown in task status.' },
				label: { type: 'string', description: 'Optional child run label.' },
				agentId: { type: 'string', description: 'Optional target agent id.' },
				model: {
					type: 'string',
					description: 'Optional model override. Use model id or provider/model.',
				},
				runTimeoutSeconds: {
					type: 'number',
					description: 'Optional positive integer timeout for the child run.',
				},
				mode: { type: 'string', enum: ['run', 'session'] },
				cleanup: { type: 'string', enum: ['delete', 'keep'] },
				context: { type: 'string', enum: ['isolated', 'fork'] },
				sandbox: { type: 'string', enum: ['inherit', 'require'] },
			},
			required: ['task'],
			additionalProperties: false,
		},
		async execute(args, ctx: ToolContext) {
			try {
				return spawnResult(
					await spawnService.spawn({
						input: args,
						requesterAgentId: ctx.agentId ?? DEFAULT_AGENT_ID,
						requesterSessionKey: ctx.sessionId,
						controllerSessionKey: ctx.sessionId,
						sessionBaseDir: ctx.sessionBaseDir,
					})
				);
			} catch (error) {
				return textResult(
					`sessions_spawn: ${error instanceof Error ? error.message : String(error)}`,
					true
				);
			}
		},
	};
}
