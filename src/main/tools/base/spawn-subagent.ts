import { DEFAULT_AGENT_ID } from '../../config';
import type { AgentTool } from '../core/tool';
import { textResult } from '../core/tool';

type SpawnPort = {
	spawn(request: {
		input: unknown;
		requesterAgentId?: string;
		requesterSessionKey: string;
		controllerSessionKey?: string;
		sessionBaseDir?: string;
	}): Promise<unknown>;
};

export const spawnSubagentTool: AgentTool = {
	name: 'spawn_subagent',
	description: 'Start a child agent run for a clearly scoped task.',
	schema: {
		type: 'object',
		properties: {
			task: { type: 'string' },
			taskName: { type: 'string' },
			label: { type: 'string' },
			agentId: { type: 'string' },
			model: { type: 'string' },
			runTimeoutSeconds: { type: 'number' },
			mode: { type: 'string', enum: ['run', 'session'] },
			cleanup: { type: 'string', enum: ['delete', 'keep'] },
			context: { type: 'string', enum: ['isolated', 'fork'] },
			sandbox: { type: 'string', enum: ['inherit', 'require'] },
		},
		required: ['task'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const subagents = (ctx.services as { subagents?: SpawnPort }).subagents;
		if (!subagents) return textResult('spawn_subagent: Subagent service is unavailable.', true);
		try {
			const result = await subagents.spawn({
				input: args,
				requesterAgentId: ctx.agentId ?? DEFAULT_AGENT_ID,
				requesterSessionKey: ctx.sessionId,
				controllerSessionKey: ctx.sessionId,
				sessionBaseDir: ctx.sessionBaseDir,
			});
			return textResult(JSON.stringify(result, null, 2));
		} catch (error) {
			return textResult(`spawn_subagent: ${(error as Error).message}`, true);
		}
	},
};
