import { Tool } from '../base.js';
import type { StoreService } from '../../../store';
import { stringArg } from './args';

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
