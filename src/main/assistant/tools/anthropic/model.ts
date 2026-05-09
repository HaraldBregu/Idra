import { Tool } from '../base.js';
import type { StoreService } from '../../../store';
import { stringArg } from './args';

export class SetAnthropicModelTool extends Tool {
	name = 'set_anthropic_model';
	description = 'Set the stored Anthropic model.';
	parameters = {
		type: 'object',
		properties: {
			model: {
				type: 'string',
				description: 'The Anthropic model id to store.',
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
		this.store.setAnthropicModel(model);
		return `Anthropic model set to ${model}.`;
	}
}
