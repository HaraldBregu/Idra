import type { TextToImageService } from '../text-to-image';
import type { TextToImageRequest } from '../text-to-image';
import type { AgentTool, AgentToolResult } from './types';

function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name} must be an object.`);
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

function optionalInteger(input: Record<string, unknown>, key: string): number | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'number' || !Number.isInteger(value)) {
		throw new Error(`${key} must be an integer.`);
	}
	return value;
}

function optionalStringArray(input: Record<string, unknown>, key: string): string[] | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed ? [trimmed] : undefined;
	}
	if (!Array.isArray(value)) throw new Error(`${key} must be a string or string array.`);
	const entries = value.flatMap((item) => {
		if (typeof item !== 'string') throw new Error(`${key} entries must be strings.`);
		const trimmed = item.trim();
		return trimmed ? [trimmed] : [];
	});
	return entries.length > 0 ? entries : undefined;
}

function requestFromArgs(args: unknown): TextToImageRequest {
	assertRecord(args, 'text_to_image arguments');
	const request: TextToImageRequest = {
		prompt: requiredString(args, 'prompt'),
	};
	const negativePrompt = optionalString(args, 'negativePrompt');
	const aspectRatio = optionalString(args, 'aspectRatio');
	const count = optionalInteger(args, 'count');
	const seed = optionalInteger(args, 'seed');
	const styleHints = optionalStringArray(args, 'styleHints');
	if (negativePrompt) request.negativePrompt = negativePrompt;
	if (aspectRatio) request.aspectRatio = aspectRatio;
	if (count !== undefined) request.count = count;
	if (seed !== undefined) request.seed = seed;
	if (styleHints) request.styleHints = styleHints;
	return request;
}

export function createTextToImageTool(textToImage: TextToImageService): AgentTool {
	return {
		name: 'text_to_image',
		displaySummary: 'Create or edit an image using the configured image module.',
		description:
			'Create an image through the main-process text-to-image module. Accepts prompt instructions and safe generation options only; provider credentials, base URLs, provider records, model ids, and raw provider payloads are not accepted.',
		schema: {
			type: 'object',
			properties: {
				prompt: { type: 'string', description: 'Image generation prompt.' },
				negativePrompt: { type: 'string', description: 'Optional negative prompt.' },
				aspectRatio: { type: 'string', description: 'Optional aspect ratio, such as 1:1 or 16:9.' },
				count: {
					type: 'integer',
					minimum: 1,
					maximum: 4,
					description: 'Number of images to create.',
				},
				seed: { type: 'integer', minimum: 0, description: 'Optional deterministic seed.' },
				styleHints: {
					oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' }, maxItems: 12 }],
					description: 'Optional style hints.',
				},
			},
			required: ['prompt'],
			additionalProperties: false,
		},
		needsApproval: true,
		async execute(args, ctx): Promise<AgentToolResult> {
			try {
				const result = await textToImage.create(requestFromArgs(args), ctx.signal);
				return {
					status: 'ok',
					content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
					details: result,
				};
			} catch (error) {
				return {
					status: 'error',
					content: [
						{
							type: 'text',
							text: `text_to_image: ${error instanceof Error ? error.message : String(error)}`,
						},
					],
				};
			}
		},
	};
}
