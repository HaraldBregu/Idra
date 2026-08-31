import { PROVIDERS, type ProviderId } from './types';

export function normalizeProvider(value: string): ProviderId | undefined {
	const provider = value.trim().toLowerCase();
	return PROVIDERS.find((candidate) => candidate === provider);
}
