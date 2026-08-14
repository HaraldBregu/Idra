import { z } from 'zod';
import { forgetMemory } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function forgetMemoryTool(config: Config): Tool {
	return tool({
		id: 'forget_memory',
		name: 'Forget memory',
		description: 'Remove exactly one persistent memory by the stable ID returned by list_memories.',
		inputSchema: z.object({
			id: z
				.string()
				.trim()
				.regex(/^memory-[a-f0-9]{16}$/i)
				.describe('Exact stable memory ID returned by list_memories.'),
		}),
		execute: ({ id }) => forgetMemory(config, id),
	});
}
