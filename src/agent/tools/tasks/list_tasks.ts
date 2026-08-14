import { listTasks } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';

export const listTasksTool = tool({
	id: 'list_tasks',
	name: 'List tasks',
	description: 'List all tasks.',
	planSafe: true,
	inputSchema: z.object({}),
	execute: () => listTasks(),
});
