import { mergeModelCatalogs, model, type ModelCatalog } from './models';

export const LLM_MODELS_BY_PROVIDER = {
	anthropic: [
		model('claude-opus-4-7', 'Claude Opus 4.7'),
		model('claude-sonnet-4-6', 'Claude Sonnet 4.6'),
		model('claude-haiku-4-5-20251001', 'Claude Haiku 4.5 20251001'),
	],
	deepseek: [
		model('deepseek-v4-pro', 'DeepSeek V4 Pro'),
		model('deepseek-v4-flash', 'DeepSeek V4 Flash'),
	],
	google: [
		model('gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview'),
		model('gemini-3.1-flash-lite', 'Gemini 3.1 Flash Lite'),
	],
	kimi: [
		model('kimi-k2.6', 'Kimi K2.6'),
		model('kimi-k2.5', 'Kimi K2.5'),
		model('kimi-k2-thinking', 'Kimi K2 Thinking'),
	],
	meta: [
		model('muse-spark', 'Muse Spark'),
		model('llama-4-maverick', 'Llama 4 Maverick'),
		model('llama-4-scout', 'Llama 4 Scout'),
	],
	minimax: [model('MiniMax-M2.7', 'MiniMax M2.7'), model('MiniMax-M2.5', 'MiniMax M2.5')],
	mistral: [
		model('mistral-large-2512', 'Mistral Large 2512'),
		model('mistral-medium-3-5', 'Mistral Medium 3.5'),
		model('devstral-2512', 'Devstral 2512'),
	],
	openai: [
		model('gpt-5.5', 'GPT-5.5'),
		model('gpt-5.4', 'GPT-5.4'),
		model('gpt-5.4-mini', 'GPT-5.4 Mini'),
	],
	qwen: [
		model('qwen3.7-max', 'Qwen3.7 Max'),
		model('qwen3.6-plus', 'Qwen3.6 Plus'),
		model('qwen3.6-flash', 'Qwen3.6 Flash'),
	],
	reka: [model('reka-flash', 'Reka Flash'), model('reka-edge-2603', 'Reka Edge 2603')],
	xai: [model('grok-4.3', 'Grok 4.3'), model('grok-build-0.1', 'Grok Build 0.1')],
	zai: [
		model('glm-5.1', 'GLM-5.1'),
		model('glm-5', 'GLM-5'),
		model('glm-5-turbo', 'GLM-5 Turbo'),
	],
} as const satisfies ModelCatalog;

export const RESEARCH_CHAT_MODELS_BY_PROVIDER = {
	perplexity: [
		model('sonar-deep-research', 'Sonar Deep Research'),
		model('sonar-reasoning-pro', 'Sonar Reasoning Pro'),
		model('sonar-pro', 'Sonar Pro'),
		model('sonar', 'Sonar'),
	],
} as const satisfies ModelCatalog;

export const CHAT_MODELS_BY_PROVIDER = mergeModelCatalogs(
	LLM_MODELS_BY_PROVIDER,
	RESEARCH_CHAT_MODELS_BY_PROVIDER
);
