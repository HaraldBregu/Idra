import { z } from 'zod';
import { listMemories } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function memoryListTool(config: Config): Tool {
	return tool({
		id: 'memory_list',
		name: 'Memory list',
		description: 'List persistent memories with their stable IDs for exact deletion.',
		inputSchema: z.object({}).strict(),
		execute: async () => ({ memories: await listMemories(config) }),
	});
}
