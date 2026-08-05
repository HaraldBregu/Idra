import { listSchedules } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';

export const listSchedulesTool = tool({
	name: 'list_schedules',
	description: 'List all tasks schedules.',
	inputSchema: z.object({}),
	execute: () => listSchedules(),
});
