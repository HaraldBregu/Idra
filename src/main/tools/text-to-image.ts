import fs from 'node:fs/promises';
import path from 'node:path';
import type { TextToImageService } from '../text-to-image';
import type {
	TextToImageAssetReference,
	TextToImageRequest,
	TextToImageResult,
	TextToImageResultRecord,
} from '../text-to-image';
import type { AgentTool, AgentToolResult } from './types';

const DATA_URL_PATTERN = /^data:([^;,]+)?(?:;[^,]*)?;base64,(.+)$/i;
const DEFAULT_OUTPUT_DIR = 'generated-images';

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

function isInsidePath(rootPath: string, targetPath: string): boolean {
	const relativePath = path.relative(path.resolve(rootPath), path.resolve(targetPath));
	return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function resolveWorkspacePath(workspace: string, requestedPath: string, name: string): string {
	const targetPath = path.isAbsolute(requestedPath)
		? path.resolve(requestedPath)
		: path.resolve(workspace, requestedPath);
	if (!isInsidePath(workspace, targetPath)) {
		throw new Error(`${name} must stay inside the workspace.`);
	}
	return targetPath;
}

function workspaceRelativePath(workspace: string, targetPath: string): string {
	return path.relative(path.resolve(workspace), path.resolve(targetPath)).split(path.sep).join('/');
}

function optionalReferences(
	input: Record<string, unknown>,
	workspace: string
): TextToImageAssetReference[] | undefined {
	const value = input.references;
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value)) throw new Error('references must be an array.');
	if (value.length > 8) throw new Error('references can include at most 8 assets.');
	return value.map((item) => {
		assertRecord(item, 'reference');
		const type = item.type;
		if (type !== 'workspace-file' && type !== 'local-file' && type !== 'remote-url') {
			throw new Error('reference type must be workspace-file, local-file, or remote-url.');
		}
		const reference: TextToImageAssetReference = { type };
		const referencePath = optionalString(item, 'path');
		const url = optionalString(item, 'url');
		const mimeType = optionalString(item, 'mimeType');
		const description = optionalString(item, 'description');
		if ((type === 'workspace-file' || type === 'local-file') && !referencePath) {
			throw new Error('reference path is required.');
		}
		if (type === 'remote-url' && !url) throw new Error('reference url is required.');
		if (type === 'workspace-file' && referencePath) {
			resolveWorkspacePath(workspace, referencePath, 'reference path');
		}
		if (type === 'remote-url' && url) {
			const parsed = new URL(url);
			if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
				throw new Error('reference url must use http or https.');
			}
		}
		if (referencePath) reference.path = referencePath;
		if (url) reference.url = url;
		if (mimeType) reference.mimeType = mimeType;
		if (description) reference.description = description;
		return reference;
	});
}

function requestFromArgs(args: unknown, workspace: string): TextToImageRequest {
	assertRecord(args, 'text_to_image arguments');
	const request: TextToImageRequest = {
		prompt: requiredString(args, 'prompt'),
	};
	const negativePrompt = optionalString(args, 'negativePrompt');
	const aspectRatio = optionalString(args, 'aspectRatio');
	const count = optionalInteger(args, 'count');
	const seed = optionalInteger(args, 'seed');
	const styleHints = optionalStringArray(args, 'styleHints');
	const references = optionalReferences(args, workspace);
	if (negativePrompt) request.negativePrompt = negativePrompt;
	if (aspectRatio) request.aspectRatio = aspectRatio;
	if (count !== undefined) request.count = count;
	if (seed !== undefined) request.seed = seed;
	if (styleHints) request.styleHints = styleHints;
	if (references) request.references = references;
	return request;
}

function extensionForImage(image: TextToImageResultRecord, sourceUrl?: string): string {
	const mimeType = image.mimeType?.trim().toLowerCase();
	if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') return '.jpg';
	if (mimeType === 'image/png') return '.png';
	if (mimeType === 'image/webp') return '.webp';
	if (mimeType === 'image/gif') return '.gif';
	const sourceExtension = sourceUrl ? path.extname(new URL(sourceUrl).pathname) : '';
	const localExtension = image.localFile ? path.extname(image.localFile) : '';
	return sourceExtension || localExtension || '.png';
}

function targetPathForImage(
	workspace: string,
	args: Record<string, unknown>,
	image: TextToImageResultRecord,
	index: number,
	total: number
): string {
	const outputPath = optionalString(args, 'outputPath');
	const outputDir = optionalString(args, 'outputDir');
	if (outputPath && outputDir) throw new Error('Use outputPath or outputDir, not both.');
	const extension = extensionForImage(image, image.assetUrl);
	if (outputPath) {
		const basePath = resolveWorkspacePath(workspace, outputPath, 'outputPath');
		if (total === 1) return basePath;
		const parsed = path.parse(basePath);
		return path.join(parsed.dir, `${parsed.name}-${index + 1}${parsed.ext || extension}`);
	}
	const directoryPath = resolveWorkspacePath(workspace, outputDir ?? DEFAULT_OUTPUT_DIR, 'outputDir');
	return path.join(directoryPath, `image-${Date.now()}-${index + 1}${extension}`);
}

async function imageBytes(image: TextToImageResultRecord, signal?: AbortSignal): Promise<Buffer> {
	if (image.localFile) {
		return fs.readFile(path.resolve(image.localFile));
	}
	const assetUrl = image.assetUrl?.trim();
	if (!assetUrl) throw new Error('Image provider returned no downloadable image asset.');
	const dataUrl = DATA_URL_PATTERN.exec(assetUrl);
	if (dataUrl) return Buffer.from(dataUrl[2] ?? '', 'base64');
	const parsed = new URL(assetUrl);
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error('Image asset URL must use http or https.');
	}
	const response = await fetch(assetUrl, { signal });
	if (!response.ok) throw new Error(`Image asset download failed: ${response.status}`);
	return Buffer.from(await response.arrayBuffer());
}

async function normalizeLocalImageResult(
	result: TextToImageResult,
	args: Record<string, unknown>,
	workspace: string,
	signal?: AbortSignal
): Promise<TextToImageResult> {
	const images: TextToImageResultRecord[] = [];
	for (const [index, image] of result.images.entries()) {
		if (!optionalString(args, 'outputPath') && !optionalString(args, 'outputDir') && image.localFile) {
			const localPath = path.isAbsolute(image.localFile)
				? path.resolve(image.localFile)
				: path.resolve(workspace, image.localFile);
			if (isInsidePath(workspace, localPath)) {
				images.push({ ...image, localFile: workspaceRelativePath(workspace, localPath) });
				continue;
			}
		}
		const targetPath = targetPathForImage(workspace, args, image, index, result.images.length);
		if (!isInsidePath(workspace, targetPath)) {
			throw new Error('Generated image path must stay inside the workspace.');
		}
		const bytes = await imageBytes(image, signal);
		await fs.mkdir(path.dirname(targetPath), { recursive: true });
		await fs.writeFile(targetPath, bytes);
		images.push({
			...image,
			assetUrl: undefined,
			localFile: workspaceRelativePath(workspace, targetPath),
		});
	}
	return { ...result, images };
}

export function createTextToImageTool(textToImage: TextToImageService): AgentTool {
	return {
		name: 'text_to_image',
		displaySummary: 'Create or edit an image using the configured image module.',
		description:
			'Create an image through the main-process text-to-image module and store the result in the workspace. Accepts prompt instructions, safe generation options, safe reference assets, and workspace output paths only; provider credentials, base URLs, provider records, model ids, and raw provider payloads are not accepted.',
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
					references: {
						type: 'array',
						maxItems: 8,
						items: {
							type: 'object',
							properties: {
								type: { type: 'string', enum: ['workspace-file', 'local-file', 'remote-url'] },
								path: { type: 'string' },
								url: { type: 'string' },
								mimeType: { type: 'string' },
								description: { type: 'string' },
							},
							required: ['type'],
							additionalProperties: false,
						},
						description: 'Optional safe input asset references.',
					},
					outputPath: {
						type: 'string',
						description: 'Workspace-relative file path for one image, or base path for multiple images.',
					},
					outputDir: {
						type: 'string',
						description: 'Workspace-relative directory for generated images.',
					},
				},
				required: ['prompt'],
				additionalProperties: false,
			},
			needsApproval: true,
			async execute(args, ctx): Promise<AgentToolResult> {
				try {
					assertRecord(args, 'text_to_image arguments');
					const result = await textToImage.create(requestFromArgs(args, ctx.workspace), ctx.signal);
					const localResult = await normalizeLocalImageResult(result, args, ctx.workspace, ctx.signal);
					return {
						status: 'ok',
						content: [{ type: 'text', text: JSON.stringify(localResult, null, 2) }],
						details: localResult,
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
