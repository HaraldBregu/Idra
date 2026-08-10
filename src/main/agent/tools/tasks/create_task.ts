import { createTask } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';
import { createTaskRequestSchema } from './schema';

export const createTaskTool = tool({
	name: 'create_task',
	description: 'Create a new task from a task definition request.',
	inputSchema: z.object({
		request: createTaskRequestSchema.describe('Task definition to create.'),
	}),
	execute: ({ request }) => createTask({ ...request, enabled: false }),
});
