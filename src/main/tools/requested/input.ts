import { objectSchema, type RequestedTool } from './shared';

export const requestUserInputTool = {
	name: 'functions.request_user_input',
	description: 'Requests one to three short questions and waits for the user response.',
	schema: objectSchema({
		questions: {
			type: 'array',
			items: objectSchema({
				header: { type: 'string' },
				id: { type: 'string' },
				question: { type: 'string' },
				options: {
					type: 'array',
					items: objectSchema({
						label: { type: 'string' },
						description: { type: 'string' },
					}, ['label', 'description']),
				},
			}, ['header', 'id', 'question', 'options']),
		},
	}, ['questions']),
} as const satisfies RequestedTool;
