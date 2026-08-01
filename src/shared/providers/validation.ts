import type { ModelCapability } from '../model_types';

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

function validateEntries(
	value: unknown,
	file: string,
	check: (entry: Record<string, unknown>, index: number) => string[]
): string[] {
	if (value === undefined) return [];
	if (!Array.isArray(value)) return [`${file} must be an array.`];
	return value.flatMap((entry, index) => {
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			return [`${file}[${index}] must be an object.`];
		}
		return check(entry as Record<string, unknown>, index);
	});
}

/** Validate the parsed contents of info.json. Returns human-readable errors, empty when valid. */
export function validateProviderInfo(value: unknown): string[] {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return ['info.json must be an object.'];
	}
	const info = value as Record<string, unknown>;
	const errors: string[] = [];
	if (!isNonEmptyString(info.id)) errors.push('info.json: "id" must be a non-empty string.');
	if (!isNonEmptyString(info.name)) errors.push('info.json: "name" must be a non-empty string.');
	if (info.apiKeyUrl !== undefined && !isNonEmptyString(info.apiKeyUrl)) {
		errors.push('info.json: "apiKeyUrl" must be a non-empty string when present.');
	}
	return errors;
}

/** Validate the parsed contents of models.json. Pass undefined when the file is absent. */
export function validateModelEntries(value: unknown): string[] {
	return validateEntries(value, 'models.json', (entry, index) => {
		const errors: string[] = [];
		if (!isNonEmptyString(entry.id))
			errors.push(`models.json[${index}]: "id" must be a non-empty string.`);
		if (!isNonEmptyString(entry.name))
			errors.push(`models.json[${index}]: "name" must be a non-empty string.`);
		if (!MODEL_CAPABILITIES.includes(entry.type as ModelCapability)) {
			errors.push(`models.json[${index}]: "type" must be one of ${MODEL_CAPABILITIES.join(', ')}.`);
		}
		if (!isNonEmptyString(entry.url))
			errors.push(`models.json[${index}]: "url" must be a non-empty string.`);
		return errors;
	});
}

/** Validate databases.json or storages.json entries. Pass undefined when the file is absent. */
export function validateServiceEntries(value: unknown, file: string): string[] {
	return validateEntries(value, file, (entry, index) => {
		const errors: string[] = [];
		if (!isNonEmptyString(entry.id))
			errors.push(`${file}[${index}]: "id" must be a non-empty string.`);
		if (!isNonEmptyString(entry.name))
			errors.push(`${file}[${index}]: "name" must be a non-empty string.`);
		if (!isNonEmptyString(entry.type))
			errors.push(`${file}[${index}]: "type" must be a non-empty string.`);
		if (entry.url !== undefined && !isNonEmptyString(entry.url)) {
			errors.push(`${file}[${index}]: "url" must be a non-empty string when present.`);
		}
		return errors;
	});
}

/** Validate web_search.json entries. Pass undefined when the file is absent. */
export function validateWebSearchEntries(value: unknown): string[] {
	return validateEntries(value, 'web_search.json', (entry, index) => {
		const errors: string[] = [];
		if (!isNonEmptyString(entry.id))
			errors.push(`web_search.json[${index}]: "id" must be a non-empty string.`);
		if (!isNonEmptyString(entry.name))
			errors.push(`web_search.json[${index}]: "name" must be a non-empty string.`);
		if (!isNonEmptyString(entry.url))
			errors.push(`web_search.json[${index}]: "url" must be a non-empty string.`);
		return errors;
	});
}
