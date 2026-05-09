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

export class GetAssistantServiceTool extends Tool {
	name = 'get_assistant_service';
	description = 'Get the currently configured assistant service (provider + model).';
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(): Promise<string> {
		const assistant = this.store.getAssistantService();
		if (!assistant) {
			return 'Error: assistant service not configured';
		}
		return JSON.stringify(assistant);
	}
}

export class GetAssistantModelTool extends Tool {
	name = 'get_assistant_model';
	description = 'Get the model used by the assistant service.';
	parameters = {
		type: 'object',
		properties: {},
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(): Promise<string> {
		const model = this.store.getAssistantModel();
		if (!model) {
			return 'Error: assistant model not configured';
		}
		return JSON.stringify(model);
	}
}

export class SetAssistantServiceTool extends Tool {
	name = 'set_assistant_service';
	description = 'Set the assistant service by selecting a stored provider id and a model.';
	parameters = {
		type: 'object',
		properties: {
			providerId: {
				type: 'string',
				description: 'The stored provider id (e.g. "openai", "anthropic").',
			},
			modelId: {
				type: 'string',
				description: 'The model identifier.',
			},
			modelName: {
				type: 'string',
				description: 'The model display name.',
			},
		},
		required: ['providerId', 'modelId', 'modelName'],
		additionalProperties: false,
	};

	constructor(private readonly store: StoreService) {
		super();
	}

	async execute(args: Record<string, unknown>): Promise<string> {
		const providerId = stringArg(args, ['providerId', 'id']);
		const modelId = stringArg(args, ['modelId']);
		const modelName = stringArg(args, ['modelName']);
		if (!providerId) {
			return 'Error: providerId must be a non-empty string';
		}
		if (!modelId) {
			return 'Error: modelId must be a non-empty string';
		}
		if (!modelName) {
			return 'Error: modelName must be a non-empty string';
		}
		const ok = this.store.setAssistantService(providerId, { id: modelId, name: modelName });
		if (!ok) {
			return `Error: provider not found: ${providerId}`;
		}
		return 'Assistant service saved.';
	}
}
