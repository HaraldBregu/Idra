import { z } from 'zod';
import { forgetMemory, memoryPath } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function forgetMemoryTool(config: Config): Tool {
	return tool({
		name: 'memory_forget',
		description: 'Remove exactly one persistent memory by the stable ID returned by memory_list.',
		inputSchema: z.object({
			id: z
				.string()
				.trim()
				.regex(/^memory-[a-f0-9]{16}$/i)
				.describe('Exact stable memory ID returned by memory_list.'),
		}),
		execute: ({ id }) => forgetMemory(config, id),
	});
}
