import { createSchedule } from '../../../tasks';
import { tool } from '../tool';
import { z } from 'zod';
import { createScheduleRequestSchema } from './schema';

export const createScheduleTool = tool({
	name: 'create_schedule',
	defaultPermission: 'allow',
	description: 'Create a new tasks schedule from a schedule definition request.',
	inputSchema: z.object({
		request: createScheduleRequestSchema.describe('Schedule definition to create.'),
	}),
	risk: 'high',
	effect: 'persistence',
	hardApproval: true,
	execute: ({ request }) => createSchedule({ ...request, enabled: false }),
});
