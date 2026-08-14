import { loadModelServiceState } from '../../../src/renderer/src/pages/start/hooks/useModelServices';
import type { ModelServiceDefinition } from '../../../src/renderer/src/pages/start/types';

const provider = { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' };
const model = { id: 'gpt-5', name: 'GPT-5' };
const modelGroups = [{ provider, models: [model] }];

const service: ModelServiceDefinition = {
	id: 'assistant',
	title: 'Assistant',
	description: 'Chat, reasoning, and planning.',
	getSelection: async () => undefined,
	loadModelGroups: async () => modelGroups,
	saveSelection: async () => true,
};

describe('onboarding model service state', () => {
	it('leaves a service empty when no model was previously selected', async () => {
		await expect(loadModelServiceState(service)).resolves.toEqual({
			providerId: '',
			modelId: '',
			modelGroups,
		});
	});

	it('restores a valid saved model selection', async () => {
		await expect(
			loadModelServiceState({
				...service,
				getSelection: async () => ({ providerId: provider.id, modelId: model.id }),
			})
		).resolves.toEqual({
			providerId: provider.id,
			modelId: model.id,
			modelGroups,
		});
	});
});
