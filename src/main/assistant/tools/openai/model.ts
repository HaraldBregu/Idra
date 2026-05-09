import { Tool } from '../base.js';
import type { StoreService } from '../../../store';
import { stringArg } from './args';

export class SetOpenAIModelTool extends Tool {
	name = 'set_openai_model';
	description = 'Set the stored OpenAI model.';
	parameters = {
		type: 'object',
		properties: {
			model: {
				type: 'string',
				description: 'The OpenAI model id to store.',
			},
		},
		required: ['model'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const model = stringArg(args, ['model']);
		if (!model) {
			return 'Error: model must be a non-empty string';
		}
		this.store.setOpenAIModel(model);
		return `OpenAI model set to ${model}.`;
	}
}
