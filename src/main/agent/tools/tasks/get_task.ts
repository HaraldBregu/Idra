import { getSchedule } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const getTaskTool = tool({
	name: 'get_task',
	defaultPermission: 'allow',
	description: 'Fetch a single task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => getSchedule(taskId),
});
