import { createSchedule } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';
import { createTaskRequestSchema } from './schema';

export const createTaskTool = tool({
	name: 'create_task',
	defaultPermission: 'allow',
	description: 'Create a new task from a task definition request.',
	inputSchema: z.object({
		request: createTaskRequestSchema.describe('Task definition to create.'),
	}),
	risk: 'high',
	effect: 'persistence',
	execute: ({ request }) => createSchedule({ ...request, enabled: false }),
});
