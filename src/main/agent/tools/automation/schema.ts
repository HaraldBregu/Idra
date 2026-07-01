import type { JSONSchema } from '../../types';

export function requireScheduleId(input: Record<string, unknown>, tool: string): string {
	const scheduleId = input.scheduleId;
	if (typeof scheduleId !== 'string' || !scheduleId.trim()) {
		throw new Error(`${tool} requires a non-empty scheduleId.`);
	}
	return scheduleId;
}

export const scheduleIdSchema: JSONSchema = {
	type: 'object',
	properties: {
		scheduleId: {
			type: 'string',
			description: 'Identifier of the schedule to act on.',
		},
	},
	required: ['scheduleId'],
	additionalProperties: false,
};

export const actionSchema: JSONSchema = {
	type: 'object',
	description: 'Action to run when the schedule fires.',
	oneOf: [
		{
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['debug'] },
				message: { type: 'string' },
			},
			required: ['type', 'message'],
			additionalProperties: false,
		},
		{
			type: 'object',
			properties: {
				type: { type: 'string', enum: ['agent'] },
				prompt: { type: 'string' },
				effort: {
					type: 'string',
					enum: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'],
				},
			},
			required: ['type', 'prompt', 'effort'],
			additionalProperties: false,
		},
	],
};
