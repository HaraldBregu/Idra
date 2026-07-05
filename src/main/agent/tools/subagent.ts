import { z } from 'zod';
import { tool } from './tool';
import type { Tool } from '../types';
import { runSubagent, type SubagentDefinition } from '../run/run_subagent';

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
