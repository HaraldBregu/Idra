import type { TextToImageService } from '../../text-to-image';
import type {
	TextToImageAssetReference,
	TextToImageRequest,
	TextToImageResult,
} from '../../text-to-image';
import type { TaskContext, TaskHandler } from '../../../shared/tasks';

export const IMAGE_CREATE_TASK_TYPE = 'image.create';

const FORBIDDEN_INPUT_KEYS = new Set([
	'apiKey',
	'accessToken',
	'authorization',
	'baseUrl',
	'credentials',
	'model',
	'modelId',
	'payload',
	'provider',
	'providerId',
	'request',
	'token',
	'webhookSecret',
]);

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Image task input must be an object.');
	}
}

function assertNoForbiddenKeys(input: Record<string, unknown>): void {
	for (const key of Object.keys(input)) {
		if (FORBIDDEN_INPUT_KEYS.has(key)) {
			throw new Error(`${key} is not allowed in image task input.`);
		}
	}
}

function requiredString(input: Record<string, unknown>, key: string): string {
	const value = input[key];
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${key} is required.`);
	return trimmed;
}

function optionalString(input: Record<string, unknown>, key: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalPositiveInteger(
	input: Record<string, unknown>,
	key: string,
	max: number
): number | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
		throw new Error(`${key} must be an integer from 1 to ${max}.`);
	}
	return value;
}

function optionalSeed(input: Record<string, unknown>): number | undefined {
	const value = input.seed;
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
		throw new Error('seed must be a non-negative integer.');
	}
	return value;
}

function optionalStyleHints(input: Record<string, unknown>): string[] | undefined {
	const value = input.styleHints;
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? [trimmed] : undefined;
	}
	if (!Array.isArray(value)) throw new Error('styleHints must be a string or string array.');
	const hints = value.flatMap((item) => {
		if (typeof item !== 'string') throw new Error('styleHints entries must be strings.');
		const trimmed = item.trim();
		return trimmed ? [trimmed] : [];
	});
	return hints.length > 0 ? hints.slice(0, 12) : undefined;
}

function optionalReferences(
	input: Record<string, unknown>
): TextToImageAssetReference[] | undefined {
	const value = input.references;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) throw new Error('references must be an array.');
	if (value.length > 8) throw new Error('references can include at most 8 assets.');
	return value.map((item) => {
		assertRecord(item);
		const type = item.type;
		if (type !== 'workspace-file' && type !== 'local-file' && type !== 'remote-url') {
			throw new Error('reference type must be workspace-file, local-file, or remote-url.');
		}
		const reference: TextToImageAssetReference = { type };
		const path = optionalString(item, 'path');
		const url = optionalString(item, 'url');
		const mimeType = optionalString(item, 'mimeType');
		const description = optionalString(item, 'description');
		if ((type === 'workspace-file' || type === 'local-file') && !path) {
			throw new Error('reference path is required.');
		}
		if (type === 'remote-url' && !url) {
			throw new Error('reference url is required.');
		}
		if (path) reference.path = path;
		if (url) reference.url = url;
		if (mimeType) reference.mimeType = mimeType;
		if (description) reference.description = description;
		return reference;
	});
}

function abortError(): Error {
	const error = new Error('Task was cancelled.');
	error.name = 'AbortError';
	return error;
}

export class ImageCreateTaskHandler implements TaskHandler<TextToImageRequest, TextToImageResult> {
	readonly type = IMAGE_CREATE_TASK_TYPE;

	constructor(private readonly textToImage: TextToImageService) {}

	validateInput(input: unknown): TextToImageRequest {
		assertRecord(input);
		assertNoForbiddenKeys(input);
		const request: TextToImageRequest = {
			prompt: requiredString(input, 'prompt'),
		};
		const negativePrompt = optionalString(input, 'negativePrompt');
		const aspectRatio = optionalString(input, 'aspectRatio');
		const count = optionalPositiveInteger(input, 'count', 4);
		const seed = optionalSeed(input);
		const styleHints = optionalStyleHints(input);
		const references = optionalReferences(input);
		if (negativePrompt) request.negativePrompt = negativePrompt;
		if (aspectRatio) request.aspectRatio = aspectRatio;
		if (count !== undefined) request.count = count;
		if (seed !== undefined) request.seed = seed;
		if (styleHints) request.styleHints = styleHints;
		if (references) request.references = references;
		return request;
	}

	async run(context: TaskContext<TextToImageRequest>): Promise<TextToImageResult> {
		if (context.signal.aborted) throw abortError();
		context.updateProgress({ message: 'Creating image' });
		const result = await this.textToImage.create(context.input, context.signal);
		if (context.signal.aborted) throw abortError();
		context.updateProgress({ message: 'Image created' });
		return result;
	}
}
