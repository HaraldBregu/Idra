import { z } from 'zod';
import { forgetMemory } from '../memory';
import type { Config, Tool } from '../types';
import { tool } from './tool';

export function forgetMemoryTool(config: Config): Tool {
	return tool({
		name: 'memory_forget',
		description:
			'Remove entries from persistent memory (MEMORY.md). Use it when the user asks you to forget something or when a stored fact is outdated or wrong. Removes every memory entry containing the given text.',
		inputSchema: z.object({
			match: z
				.string()
				.min(1)
				.describe('Text identifying the memory entries to remove (case-insensitive match).'),
		}),
		execute: ({ match }) => forgetMemory(config, match),
	});
}
