import { createSchedule } from '../../../app/cron';
import { tool } from '../tool';
import { z } from 'zod';
import { createScheduleRequestSchema } from './schema';

export const createScheduleTool = tool({
	name: 'create_schedule',
	description: 'Create a new cron schedule from a schedule definition request.',
	inputSchema: z.object({
		request: createScheduleRequestSchema.describe('Schedule definition to create.'),
	}),
	execute: ({ request }) => createSchedule(request),
});
