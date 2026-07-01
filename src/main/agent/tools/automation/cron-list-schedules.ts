import { listSchedules } from '../../cron';
import { tool } from '../../shared/tool';
import { z } from 'zod';

export const listSchedulesTool = tool({
	name: 'list_schedules',
	description: 'List all cron schedules.',
	inputSchema: z.object({}),
	execute: () => listSchedules(),
});
