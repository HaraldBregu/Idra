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

export const taskIdSchema = z.object({
	taskId: z.string().min(1).describe('Identifier of the task to act on.'),
});

export const createTaskRequestSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	cronExpression: z.string().optional(),
	enabled: z.boolean().optional(),
	action: taskActionSchema,
});

export const updateTaskRequestSchema = z
	.object({
		name: z.string().optional(),
		description: z.string().optional(),
		cronExpression: z.string().optional(),
		enabled: z.boolean().optional(),
	action: taskActionSchema.optional(),
	})
	.refine((value) => Object.keys(value).length > 0, {
		message: 'update_task requires at least one field in request.',
	});
