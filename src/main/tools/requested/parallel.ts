import { objectSchema, type RequestedTool } from './shared';

export const parallelTool = {
	name: 'multi_tool_use.parallel',
	description: 'Runs multiple developer tools simultaneously when the calls are independent.',
	schema: objectSchema({
		tool_uses: {
			type: 'array',
			items: objectSchema({
				recipient_name: { type: 'string' },
				parameters: { type: 'object', additionalProperties: true },
			}, ['recipient_name', 'parameters']),
		},
	}, ['tool_uses']),
} as const satisfies RequestedTool;
