import type { Model } from './service';

export const DEFAULT_AGENT_MODELS_BY_PROVIDER: Readonly<Record<string, readonly Model[]>> = {
	openai: [
		{ id: 'gpt-5.5', name: 'GPT-5.5' },
		{ id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
		{ id: 'gpt-5.4', name: 'GPT-5.4' },
		{ id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
		{ id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
	],
	anthropic: [
		{ id: 'claude-opus-4-7', name: 'Claude Opus 4.7' },
		{ id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
		{ id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
		{ id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5' },
		{ id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
	],
	google: [
		{ id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
		{ id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
		{ id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
		{ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
		{ id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite' },
	],
	mistral: [
		{ id: 'mistral-large-3', name: 'Mistral Large 3' },
		{ id: 'mistral-medium-3.5', name: 'Mistral Medium 3.5' },
		{ id: 'mistral-small-4', name: 'Mistral Small 4' },
		{ id: 'magistral-medium-1.2', name: 'Magistral Medium 1.2' },
		{ id: 'devstral-2', name: 'Devstral 2' },
	],
	xai: [
		{ id: 'grok-4.3', name: 'Grok 4.3' },
		{ id: 'grok-4.3-fast', name: 'Grok 4.3 Fast' },
		{ id: 'grok-code-fast', name: 'Grok Code Fast' },
	],
	perplexity: [
		{ id: 'sonar-reasoning-pro', name: 'Sonar Reasoning Pro' },
		{ id: 'sonar-pro', name: 'Sonar Pro' },
		{ id: 'sonar-deep-research', name: 'Sonar Deep Research' },
		{ id: 'r1-1776', name: 'R1 1776' },
	],
	deepseek: [
		{ id: 'deepseek-v4-pro', name: 'DeepSeek V4-Pro' },
		{ id: 'deepseek-v4-flash', name: 'DeepSeek V4-Flash' },
		{ id: 'deepseek-v3.2-speciale', name: 'DeepSeek V3.2-Speciale' },
		{ id: 'deepseek-v3.2', name: 'DeepSeek V3.2' },
		{ id: 'deepseek-r1', name: 'DeepSeek R1' },
	],
} as const;

function normalizeProviderId(providerId: string): string {
	return providerId.trim().toLowerCase();
}

export function getDefaultAgentModels(providerId: string): Model[] {
	return (DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] ?? []).map(
		(model) => ({ ...model })
	);
}

export function hasDefaultAgentModels(providerId: string): boolean {
	return DEFAULT_AGENT_MODELS_BY_PROVIDER[normalizeProviderId(providerId)] !== undefined;
}
