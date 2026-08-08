import { z } from 'zod';
import { listMemories } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function memoryListTool(config: Config): Tool {
	return tool({
		name: 'memory_list',
		description: 'List persistent memories with their stable IDs for exact deletion.',
		defaultPermission: 'allow',
		risk: 'medium',
		effect: 'read',
		allowedOrigins: ['main'],
		inputSchema: z.object({}).strict(),
		execute: async () => ({ memories: await listMemories(config) }),
	});
}
