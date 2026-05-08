import { Tool } from './base.js';
import type { StoreService } from '../../store';

function stringArg(args: Record<string, unknown>, names: string[]): string {
	for (const name of names) {
		const value = args[name];
		if (typeof value === 'string') {
			return value.trim();
		}
	}
	return '';
}

export class SetOpenAIKeyTool extends Tool {
	name = 'set_openai_api_key';
	description = 'Set the stored OpenAI API key.';
	parameters = {
		type: 'object',
		properties: {
			apiKey: {
				type: 'string',
				description: 'The OpenAI API key to store.',
			},
		},
		required: ['apiKey'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const apiKey = stringArg(args, ['apiKey', 'apikey']);
		if (!apiKey) {
			return 'Error: apiKey must be a non-empty string';
		}
		this.store.setOpenAIKey(apiKey);
		return 'OpenAI API key saved.';
	}
}

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
