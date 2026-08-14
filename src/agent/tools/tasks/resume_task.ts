import { resumeTask } from '../../../tasks';
import { tool } from '../tool';
import { taskIdSchema } from './schema';

export const resumeTaskTool = tool({
	id: 'resume_task',
	name: 'Resume task',
	description: 'Resume a paused task by id.',
	inputSchema: taskIdSchema,
	execute: ({ taskId }) => {
		resumeTask(taskId);
	},
});
