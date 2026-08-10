import { z } from 'zod';
import { saveHealthData } from '../../health';
import type { Config, Tool } from '../../types';
import { tool } from '../tool';

export function updateHealthTool(config: Config): Tool {
	return tool({
		name: 'health_update',
		description:
			'Overwrite HEALTH.md, the checklist executed by the automated background health check. Provide the full new markdown content; non-heading lines are treated as checklist items, and an empty checklist disables the check.',
		inputSchema: z.object({
			content: z.string().describe('The complete new content of HEALTH.md.'),
		}),
		execute: ({ content }) => saveHealthData(config, content),
	});
}
