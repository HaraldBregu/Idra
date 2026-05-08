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

export class SetAnthropicKeyTool extends Tool {
	name = 'set_anthropic_api_key';
	description = 'Set the stored Anthropic API key.';
	parameters = {
		type: 'object',
		properties: {
			apiKey: {
				type: 'string',
				description: 'The Anthropic API key to store.',
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
		this.store.setAnthropicKey(apiKey);
		return 'Anthropic API key saved.';
	}
}

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
