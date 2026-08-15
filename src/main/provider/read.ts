import fs from 'node:fs';
import { ProviderError } from './error';
import { providerPath } from './path';
import { PROVIDERS, type ProviderConfiguration, type ProviderId } from './types';

export function readProvider(dataDirectory: string): ProviderConfiguration | undefined {
	const filePath = providerPath(dataDirectory);
	if (!fs.existsSync(filePath)) return undefined;
	if (fs.lstatSync(filePath).isSymbolicLink()) {
		throw new ProviderError(400, 'The provider configuration cannot be a symbolic link.');
	}

	const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<ProviderConfiguration>;
	if (
		!parsed ||
		typeof parsed !== 'object' ||
		!PROVIDERS.includes(parsed.provider as ProviderId) ||
		typeof parsed.model !== 'string' ||
		!parsed.model.trim() ||
		typeof parsed.apiKey !== 'string' ||
		!parsed.apiKey.trim()
	) {
		throw new ProviderError(500, 'The provider configuration is invalid.');
	}
	return {
		provider: parsed.provider as ProviderId,
		model: parsed.model.trim(),
		apiKey: parsed.apiKey.trim(),
	};
}
