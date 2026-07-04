import { LlmModel } from '../models/llm';
import type { TextRequest } from '../../shared/text_types';
import { getProvider } from '../providers';
import {
	getModelId as getStoredModelId,
	getProviderId as getStoredProviderId,
} from './text_store';

const llmModel = new LlmModel();
const MAX_TOKENS = 4096;

export async function generateText(request: TextRequest): Promise<string> {
	const prompt = request.prompt?.trim();
	if (!prompt) throw new Error('Prompt is required.');

	const providerId = request.providerId?.trim() || getStoredProviderId();
	if (!providerId) throw new Error('Text provider not configured.');

	const modelId = request.modelId?.trim() || getStoredModelId();
	if (!modelId) throw new Error('Text model not configured.');

	const provider = getProvider(providerId);
	if (!provider) throw new Error(`Provider not configured: ${providerId}`);

	const response = await llmModel.generate({
		provider: { id: providerId, apiKey: provider.apiKey, baseURL: provider.baseUrl },
		model: modelId,
		messages: [{ role: 'user', content: prompt }],
		maxTokens: MAX_TOKENS,
	});
	return response.content;
}
