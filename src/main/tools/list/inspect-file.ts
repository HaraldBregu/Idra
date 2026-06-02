import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool, AgentToolResult } from '../base/tool';
import { textResult } from '../base/tool';
import { TOOL_LIMITS } from '../base/limits';
import { resolveAbs, snapshot } from './internal/common';

interface InspectFileArgs {
	path: string;
	maxBytes?: number;
	includeImage?: boolean;
}

const DEFAULT_INSPECT_BYTES = TOOL_LIMITS.inspectFile.defaultBytes;
const MAX_INSPECT_BYTES = TOOL_LIMITS.inspectFile.maxBytes;
const PREVIEW_BYTES = TOOL_LIMITS.inspectFile.previewBytes;
const DIRECT_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export const inspectFileTool: AgentTool<InspectFileArgs> = {
	name: 'inspect_file',
	description:
		'Inspect any file as bytes. Returns size, type, hash when practical, hex/text previews, and direct image content for PNG/JPEG/GIF/WebP files.',
	schema: {
		type: 'object',
		properties: {
			path: { type: 'string' },
			maxBytes: {
				type: 'number',
				description:
					'Maximum bytes to load for previews or direct image content. Default 8388608, max 16777216.',
			},
			includeImage: {
				type: 'boolean',
				description: 'Include direct image content for supported image files. Defaults true.',
			},
		},
		required: ['path'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		let abs: string;
		try {
			abs = resolveAbs(ctx.workspace, args.path);
		} catch (err) {
			return textResult(`inspect_file: ${(err as Error).message}`, true);
		}
		try {
			const stat = await fs.stat(abs);
			if (!stat.isFile()) return textResult(`inspect_file: ${args.path} is not a file`, true);
			const maxBytes = Math.floor(
				Math.max(1, Math.min(args.maxBytes ?? DEFAULT_INSPECT_BYTES, MAX_INSPECT_BYTES))
			);
			const { buffer, truncated } = await readFileSample(abs, stat.size, maxBytes);
			const detected = detectFileType(buffer, abs);
			const hash = truncated ? undefined : createHash('sha256').update(buffer).digest('hex');
			const textPreview = looksLikeText(buffer)
				? buffer.subarray(0, PREVIEW_BYTES).toString('utf8')
				: undefined;
			const hexPreview = buffer
				.subarray(0, PREVIEW_BYTES)
				.toString('hex')
				.replace(/(.{2})/g, '$1 ')
				.trim();
			const lines = [
				`# ${abs}`,
				`size: ${stat.size} bytes`,
				`loaded: ${buffer.length} bytes${truncated ? ' (truncated)' : ''}`,
				`mimeType: ${detected.mimeType}`,
			];
			if (detected.width && detected.height)
				lines.push(`dimensions: ${detected.width}x${detected.height}`);
			if (hash) lines.push(`sha256: ${hash}`);
			lines.push(`firstBytesHex: ${hexPreview || '(empty file)'}`);
			if (textPreview) lines.push(`textPreview:\n${textPreview}`);
			const includeImage =
				args.includeImage !== false && !truncated && DIRECT_IMAGE_MIME_TYPES.has(detected.mimeType);
			if (DIRECT_IMAGE_MIME_TYPES.has(detected.mimeType) && !includeImage && truncated) {
				lines.push(`imageContent: omitted because file exceeds maxBytes (${maxBytes})`);
			}
			const content: AgentToolResult['content'] = [{ type: 'text', text: lines.join('\n') }];
			if (includeImage) {
				content.push({
					type: 'image' as const,
					mimeType: detected.mimeType,
					base64: buffer.toString('base64'),
				});
			}
			ctx.readState.set(abs, snapshot(stat));
			return {
				status: 'ok',
				content,
				details: {
					path: args.path,
					absolutePath: abs,
					size: stat.size,
					loadedBytes: buffer.length,
					truncated,
					mimeType: detected.mimeType,
					width: detected.width,
					height: detected.height,
					sha256: hash,
					includedImage: includeImage,
				},
			};
		} catch (err) {
			return textResult(`inspect_file: ${(err as Error).message}`, true);
		}
	},
};

async function readFileSample(
	abs: string,
	size: number,
	maxBytes: number
): Promise<{ buffer: Buffer; truncated: boolean }> {
	if (size <= maxBytes) return { buffer: await fs.readFile(abs), truncated: false };
	const handle = await fs.open(abs, 'r');
	try {
		const buffer = Buffer.alloc(maxBytes);
		const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
		return { buffer: buffer.subarray(0, bytesRead), truncated: true };
	} finally {
		await handle.close();
	}
}

function looksLikeText(buffer: Buffer): boolean {
	if (buffer.length === 0) return true;
	if (buffer.includes(0)) return false;
	const text = buffer.toString('utf8');
	const replacements = text.match(/\uFFFD/g)?.length ?? 0;
	return replacements <= Math.max(1, text.length * 0.01);
}

function detectFileType(
	buffer: Buffer,
	filePath: string
): { mimeType: string; width?: number; height?: number } {
	if (
		buffer.length >= 24 &&
		buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
	) {
		return {
			mimeType: 'image/png',
			width: buffer.readUInt32BE(16),
			height: buffer.readUInt32BE(20),
		};
	}
	if (
		buffer.length >= 10 &&
		buffer
			.subarray(0, 6)
			.toString('ascii')
			.match(/^GIF8[79]a$/)
	) {
		return { mimeType: 'image/gif', width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
	}
	if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
		return { mimeType: 'image/jpeg', ...jpegDimensions(buffer) };
	}
	if (
		buffer.length >= 16 &&
		buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
		buffer.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return { mimeType: 'image/webp', ...webpDimensions(buffer) };
	}
	if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { mimeType: 'application/pdf' };
	if (buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])))
		return { mimeType: 'application/zip' };
	return {
		mimeType:
			mimeFromExtension(filePath) ??
			(looksLikeText(buffer) ? 'text/plain' : 'application/octet-stream'),
	};
}

function jpegDimensions(buffer: Buffer): { width?: number; height?: number } {
	let offset = 2;
	while (offset + 9 < buffer.length) {
		if (buffer[offset] !== 0xff) {
			offset++;
			continue;
		}
		const marker = buffer[offset + 1];
		offset += 2;
		if (marker === 0xd9 || marker === 0xda) break;
		if (offset + 2 > buffer.length) break;
		const length = buffer.readUInt16BE(offset);
		if (length < 2 || offset + length > buffer.length) break;
		if (
			(marker >= 0xc0 && marker <= 0xc3) ||
			(marker >= 0xc5 && marker <= 0xc7) ||
			(marker >= 0xc9 && marker <= 0xcb) ||
			(marker >= 0xcd && marker <= 0xcf)
		) {
			return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
		}
		offset += length;
	}
	return {};
}

function webpDimensions(buffer: Buffer): { width?: number; height?: number } {
	const chunk = buffer.subarray(12, 16).toString('ascii');
	if (chunk === 'VP8X' && buffer.length >= 30) {
		return {
			width: buffer.readUIntLE(24, 3) + 1,
			height: buffer.readUIntLE(27, 3) + 1,
		};
	}
	return {};
}

function mimeFromExtension(filePath: string): string | undefined {
	switch (path.extname(filePath).toLowerCase()) {
		case '.txt':
		case '.md':
		case '.ts':
		case '.tsx':
		case '.js':
		case '.jsx':
		case '.json':
		case '.css':
		case '.html':
		case '.xml':
		case '.svg':
			return 'text/plain';
		case '.pdf':
			return 'application/pdf';
		default:
			return undefined;
	}
}
