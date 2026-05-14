import type { AgentTool } from './types';
import { textResult } from './types';

export const getAssistantServiceTool: AgentTool = {
	name: 'get_assistant_service',
	description: 'Get the currently configured assistant service (provider + model).',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const assistant = ctx.services.store.getAssistantService();
		if (!assistant) return textResult('assistant service not configured', true);
		return textResult(JSON.stringify(assistant));
	},
};

export const getAssistantModelTool: AgentTool = {
	name: 'get_assistant_model',
	description: 'Get the model used by the assistant service.',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const model = ctx.services.store.getAssistantModel();
		if (!model) return textResult('assistant model not configured', true);
		return textResult(JSON.stringify(model));
	},
};

interface SetAssistantServiceArgs {
	providerId: string;
	modelId: string;
	modelName: string;
}

export const setAssistantServiceTool: AgentTool<SetAssistantServiceArgs> = {
	name: 'set_assistant_service',
	description: 'Set the assistant service by selecting a stored provider id and a model.',
	schema: {
		type: 'object',
		properties: {
			providerId: { type: 'string' },
			modelId: { type: 'string' },
			modelName: { type: 'string' },
		},
		required: ['providerId', 'modelId', 'modelName'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const providerId = String(args.providerId ?? '').trim();
		const modelId = String(args.modelId ?? '').trim();
		const modelName = String(args.modelName ?? '').trim();
		if (!providerId || !modelId || !modelName) return textResult('all fields required', true);
		const ok = ctx.services.store.setAssistantService(providerId, {
			id: modelId,
			name: modelName,
		});
		if (!ok) return textResult(`provider not found: ${providerId}`, true);
		return textResult('Assistant service saved.');
	},
};
