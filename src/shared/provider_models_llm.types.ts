import { LLM_MODELS_BY_PROVIDER } from './provider_models_llm.definitions';

export type LlmProviderId = keyof typeof LLM_MODELS_BY_PROVIDER;
