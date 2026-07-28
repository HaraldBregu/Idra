import { z } from 'zod';
import { saveMemory } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function saveMemoryTool(config: Config): Tool {
	return tool({
		name: 'memory_save',
		description:
			'Save a durable fact to persistent memory (MEMORY.md), which is loaded into every conversation. Use it whenever the user asks you to remember something, and proactively when you learn a lasting fact about the user, their preferences, or ongoing work. Save one short fact per call; do not save transient conversation details.',
		inputSchema: z.object({
			fact: z
				.string()
				.min(1)
				.describe('The fact to remember, as one short self-contained sentence.'),
		}),
		execute: ({ fact }) => saveMemory(config, fact),
	});
}
