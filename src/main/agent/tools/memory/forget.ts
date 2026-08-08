import { z } from 'zod';
import { forgetMemory, memoryPath } from '../../memory';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function forgetMemoryTool(config: Config): Tool {
	return tool({
		name: 'memory_forget',
		description:
			'Remove exactly one persistent memory by the stable ID returned by memory_list.',
		defaultPermission: 'ask',
		alwaysAsk: true,
		hardApproval: true,
		stopOnReject: true,
		risk: 'high',
		effect: 'persistence',
		allowedOrigins: ['main'],
		inputSchema: z.object({
			id: z
				.string()
				.trim()
				.regex(/^memory-[a-f0-9]{16}$/i)
				.describe('Exact stable memory ID returned by memory_list.'),
		}),
		confirmDetail: ({ id }) => `Delete persistent memory ${id}.`,
		targets: () => [memoryPath(config)],
		execute: ({ id }) => forgetMemory(config, id),
	});
}
