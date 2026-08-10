import { listTasks } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';

export const listTasksTool = tool({
	name: 'list_tasks',
	defaultPermission: 'allow',
	description: 'List all tasks.',
	inputSchema: z.object({}),
	execute: () => listTasks(),
});
