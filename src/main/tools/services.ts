import type { AgentTool } from './types';
import { textResult } from './types';

export const getAgentServiceTool: AgentTool = {
	name: 'get_agent_service',
	description: 'Get the currently configured agent service (provider + model).',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const agent = ctx.services.store.getAgentService();
		if (!agent) return textResult('agent service not configured', true);
		return textResult(JSON.stringify(agent));
	},
};

export const getAgentModelTool: AgentTool = {
	name: 'get_agent_model',
	description: 'Get the model used by the agent service.',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, ctx) {
		const model = ctx.services.store.getAgentModel();
		if (!model) return textResult('agent model not configured', true);
		return textResult(JSON.stringify(model));
	},
};

interface SetAgentServiceArgs {
	providerId: string;
	modelId: string;
	modelName: string;
}

export const setAgentServiceTool: AgentTool<SetAgentServiceArgs> = {
	name: 'set_agent_service',
	description: 'Set the agent service by selecting a stored provider id and a model.',
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
		const ok = ctx.services.store.setAgentService(providerId, {
			id: modelId,
			name: modelName,
		});
		if (!ok) return textResult(`provider not found: ${providerId}`, true);
		return textResult('Agent service saved.');
	},
};
