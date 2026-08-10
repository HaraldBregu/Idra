import { listTasks } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';

export const listTasksTool = tool({
	id: 'list_tasks',
	name: 'list_tasks',
	description: 'List all tasks.',
	inputSchema: z.object({}),
	execute: () => listTasks(),
});
