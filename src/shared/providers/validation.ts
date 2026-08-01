import type { ProviderManifest } from '../provider_types';

const MODEL_SERVICE_TYPES = [
	'large-language-model',
	'research-chat-model',
	'speech-to-text-model',
	'text-to-speech-model',
	'realtime-voice-model',
	'text-to-image-model',
	'text-to-video-model',
	'text-to-audio-model',
	'embedding-model',
] as const;

const SERVICE_TYPES = [...MODEL_SERVICE_TYPES, 'web-search', 'database', 'storage'] as const;

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
	for (const field of ['icon_dark_url', 'icon_light_url'] as const) {
		if (manifest[field] !== undefined && (!isNonEmptyString(manifest[field]) || !manifest[field].startsWith('/images/'))) {
			errors.push(`manifest.json: "${field}" must be an /images/ path when present.`);
		}
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
		if (!SERVICE_TYPES.includes(service.type as (typeof SERVICE_TYPES)[number])) {
			serviceErrors.push(`manifest.json: services[${index}].type must be one of ${SERVICE_TYPES.join(', ')}.`);
		}
		if (!isNonEmptyString(service.url)) serviceErrors.push(`manifest.json: services[${index}].url must be a non-empty string.`);
		return serviceErrors;
	});
}

export function parseProviderManifest(value: unknown): ProviderManifest | undefined {
	return validateProviderManifest(value).length === 0 ? (value as ProviderManifest) : undefined;
}
