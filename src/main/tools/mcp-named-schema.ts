export function namedSchema(nameDescription: string) {
	return {
		type: 'object',
		properties: {
			id: { type: 'string' },
			name: { type: 'string', description: nameDescription },
		},
		required: ['id', 'name'],
		additionalProperties: false,
	};
}
