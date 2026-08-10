import { z } from 'zod';
import { MAX_MEMORY_FACT_LENGTH, saveMemory } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function saveMemoryTool(config: Config): Tool {
	return tool({
		id: 'memory_save',
		name: 'Memory Save',
		description:
			'Save one durable fact to persistent memory after the user explicitly asks for it. Do not save secrets or transient conversation details.',
		inputSchema: z.object({
			fact: z
				.string()
				.trim()
				.min(1)
				.max(MAX_MEMORY_FACT_LENGTH)
				.describe('The fact to remember, as one short self-contained sentence.'),
		}),
		execute: ({ fact }) => saveMemory(config, fact),
	});
}
