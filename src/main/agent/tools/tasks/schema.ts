import { z } from 'zod';

export const taskActionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('debug'),
		message: z.string(),
	}),
	z.object({
		type: z.literal('agent'),
		prompt: z.string(),
		effort: z.enum(['none', 'minimal', 'low', 'medium', 'high', 'xhigh']),
	}),
]);

export const scheduleIdSchema = z.object({
	scheduleId: z.string().min(1).describe('Identifier of the schedule to act on.'),
});

export const createScheduleRequestSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	cronExpression: z.string().optional(),
	enabled: z.boolean().optional(),
	action: taskActionSchema,
});

export const updateScheduleRequestSchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		cronExpression: z.string().optional(),
		enabled: z.boolean().optional(),
	action: taskActionSchema.optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'update_schedule requires at least one field in request.',
	});
