export const optionsSchema = {
	type: 'object',
	properties: {
		id: { type: 'string' },
		options: { type: 'object', additionalProperties: true },
	},
	required: ['id'],
	additionalProperties: false,
};
