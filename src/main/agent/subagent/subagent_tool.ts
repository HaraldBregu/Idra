import { z } from 'zod';
import { tool } from '../tools/tool';
import type { Tool } from '../types';
import { runSubagent } from './subagent_run';
import type { SubagentDefinition } from './subagent_types';

export function subagentTool(definition: SubagentDefinition): Tool {
	return tool({
		name: definition.name,
		description: definition.description,
		inputSchema: z.object({
			task: z.string().describe('The task for the subagent to complete'),
		}),
		execute: ({ task }) => runSubagent(definition, task),
	});
}
