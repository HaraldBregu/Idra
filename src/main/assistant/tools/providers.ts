import type { AgentTool } from './types';
import { textResult } from './types';

interface GetProviderArgs {
	id: string;
}

export const getProviderByIdTool: AgentTool<GetProviderArgs> = {
	name: 'get_provider_by_id',
	description: 'Get a stored provider by its id (e.g. "openai", "anthropic").',
	schema: {
		type: 'object',
		properties: { id: { type: 'string' } },
		required: ['id'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const id = String(args.id ?? '').trim();
		if (!id) return textResult('id must be a non-empty string', true);
		const provider = ctx.services.store.getProviderById(id);
		if (!provider) return textResult(`provider not found: ${id}`, true);
		return textResult(JSON.stringify(provider));
	},
};

interface SetProviderApiKeyArgs {
	id: string;
	apiKey: string;
}

export const setProviderApiKeyTool: AgentTool<SetProviderApiKeyArgs> = {
	name: 'set_provider_api_key',
	description: 'Set the stored API key for a provider id ("openai" or "anthropic").',
	schema: {
		type: 'object',
		properties: { id: { type: 'string' }, apiKey: { type: 'string' } },
		required: ['id', 'apiKey'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const id = String(args.id ?? '').trim().toLowerCase();
		const apiKey = String(args.apiKey ?? '').trim();
		if (!id) return textResult('id required', true);
		if (!apiKey) return textResult('apiKey required', true);
		const store = ctx.services.store;
		if (id === 'openai') {
			store.setOpenAiApiKey(apiKey);
			return textResult('OpenAI API key saved.');
		}
		if (id === 'anthropic') {
			store.setAnthropicApiKey(apiKey);
			return textResult('Anthropic API key saved.');
		}
		return textResult(`unsupported provider id: ${id}`, true);
	},
};
