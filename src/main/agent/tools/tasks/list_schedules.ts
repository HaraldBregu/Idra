import { listSchedules } from '../../../app/cron';
import { tool } from '../tool';
import { z } from 'zod';

export const listSchedulesTool = tool({
	name: 'list_schedules',
	description: 'List all cron schedules.',
	inputSchema: z.object({}),
	execute: () => listSchedules(),
});
