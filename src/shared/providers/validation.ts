import type { ModelCapability } from '../model_types';
import type { ProviderManifest } from '../provider_types';

const MODEL_CAPABILITIES: readonly ModelCapability[] = [
	'llm',
	'research-chat',
	'speech-to-text',
	'text-to-speech',
	'realtime-voice',
	'text-to-image',
	'text-to-video',
	'text-to-audio',
	'embedding',
];

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

/** Validate a provider manifest. Returns human-readable errors, empty when valid. */
export function validateProviderManifest(value: unknown): string[] {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return ['manifest.json must be an object.'];
	}
	const manifest = value as Record<string, unknown>;
	const errors: string[] = [];
	if (!isNonEmptyString(manifest.providerId)) {
		errors.push('manifest.json: "providerId" must be a non-empty string.');
	}
	if (!isNonEmptyString(manifest.providerName)) {
		errors.push('manifest.json: "providerName" must be a non-empty string.');
	}
	if (manifest.apiKeyUrl !== undefined && !isNonEmptyString(manifest.apiKeyUrl)) {
		errors.push('manifest.json: "apiKeyUrl" must be a non-empty string when present.');
	}
	if (!Array.isArray(manifest.services)) return [...errors, 'manifest.json: "services" must be an array.'];
	return manifest.services.flatMap((value, index) => {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			return [`manifest.json: services[${index}] must be an object.`];
		}
		const service = value as Record<string, unknown>;
		const serviceErrors: string[] = [];
		if (!isNonEmptyString(service.id)) serviceErrors.push(`manifest.json: services[${index}].id must be a non-empty string.`);
		if (!isNonEmptyString(service.name)) serviceErrors.push(`manifest.json: services[${index}].name must be a non-empty string.`);
		if (!isNonEmptyString(service.type)) serviceErrors.push(`manifest.json: services[${index}].type must be a non-empty string.`);
		if (service.type === 'web-search' || MODEL_CAPABILITIES.includes(service.type as ModelCapability)) {
			if (!isNonEmptyString(service.url)) serviceErrors.push(`manifest.json: services[${index}].url must be a non-empty string.`);
		}
		return serviceErrors;
	});
}

export function parseProviderManifest(value: unknown): ProviderManifest | undefined {
	return validateProviderManifest(value).length === 0 ? (value as ProviderManifest) : undefined;
}
