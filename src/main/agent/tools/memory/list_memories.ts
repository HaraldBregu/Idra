import { z } from 'zod';
import { listMemories } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function listMemoriesTool(config: Config): Tool {
	return tool({
		id: 'list_memories',
		name: 'List memories',
		description: 'List persistent memories with their stable IDs for exact deletion.',
		planSafe: true,
		inputSchema: z.object({}).strict(),
		execute: async () => ({ memories: await listMemories(config) }),
	});
}
