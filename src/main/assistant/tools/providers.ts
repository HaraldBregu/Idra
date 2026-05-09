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

export class GetProviderByIdTool extends Tool {
	name = 'get_provider_by_id';
	description = 'Get a stored provider by its id (e.g. "openai", "anthropic").';
	parameters = {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'The provider id to look up.',
			},
		},
		required: ['id'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const id = stringArg(args, ['id', 'providerId']);
		if (!id) {
			return 'Error: id must be a non-empty string';
		}
		const provider = this.store.getProviderById(id);
		if (!provider) {
			return `Error: provider not found: ${id}`;
		}
		return JSON.stringify(provider);
	}
}

export class SetProviderApiKeyTool extends Tool {
	name = 'set_provider_api_key';
	description = 'Set the stored API key for a provider by id ("openai" or "anthropic").';
	parameters = {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				description: 'The provider id ("openai" or "anthropic").',
			},
			apiKey: {
				type: 'string',
				description: 'The API key to store.',
			},
		},
		required: ['id', 'apiKey'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const id = stringArg(args, ['id', 'providerId']).toLowerCase();
		const apiKey = stringArg(args, ['apiKey', 'apikey']);
		if (!id) {
			return 'Error: id must be a non-empty string';
		}
		if (!apiKey) {
			return 'Error: apiKey must be a non-empty string';
		}
		switch (id) {
			case 'openai':
				this.store.setOpenAiApiKey(apiKey);
				return 'OpenAI API key saved.';
			case 'anthropic':
				this.store.setAnthropicApiKey(apiKey);
				return 'Anthropic API key saved.';
			default:
				return `Error: unsupported provider id: ${id}`;
		}
	}
}
