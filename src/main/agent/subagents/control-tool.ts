import type { AgentTool, AgentToolResult, ToolContext } from '../tools';
import { textResult } from '../tools';
import type { SubagentSpawnPort } from './spawn-service';
import type { SubagentsControlResult } from './types';

function controlResult(result: SubagentsControlResult): AgentToolResult<SubagentsControlResult> {
	return {
		status: 'ok',
		content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
		details: result,
	};
}

export function createSubagentsControlTool(subagents: SubagentSpawnPort): AgentTool {
	return {
		name: 'subagents',
		displaySummary: 'Control child subagent runs.',
		description:
			'List, cancel, or inspect child subagent runs controlled by the current session. This tool cannot control sibling or unrelated sessions.',
		schema: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['list', 'cancel', 'history'],
					description: 'Control action to run.',
				},
				runId: {
					type: 'string',
					description: 'Required for cancel and history.',
				},
			},
			required: ['action'],
			additionalProperties: false,
		},
		async execute(args, ctx: ToolContext) {
			try {
				return controlResult(
					await subagents.control({
						input: args,
						requesterSessionKey: ctx.sessionId,
						sessionBaseDir: ctx.sessionBaseDir,
					})
				);
			} catch (error) {
				return textResult(
					`subagents: ${error instanceof Error ? error.message : String(error)}`,
					true
				);
			}
		},
	};
}
