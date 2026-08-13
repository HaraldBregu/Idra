import type { AgentInputFile } from './agent_types';

export const AGENT_MAX_ATTACHMENT_COUNT = 10;
export const AGENT_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const AGENT_MAX_ATTACHMENT_TOTAL_BYTES = 50 * 1024 * 1024;
export const AGENT_MAX_TEXT_ATTACHMENT_BYTES = 120_000;
export const AGENT_MAX_TEXT_ATTACHMENT_TOTAL_BYTES = 500_000;

export const AGENT_TEXT_ATTACHMENT_EXTENSIONS = [
	'.txt',
	'.md',
	'.markdown',
	'.csv',
	'.json',
	'.jsonl',
	'.log',
	'.yaml',
	'.yml',
	'.toml',
	'.xml',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.ts',
	'.tsx',
	'.py',
	'.java',
	'.kt',
	'.go',
	'.rs',
	'.c',
	'.h',
	'.cpp',
	'.hpp',
	'.cs',
	'.php',
	'.rb',
	'.swift',
	'.sh',
	'.bash',
	'.zsh',
	'.fish',
	'.ps1',
	'.sql',
	'.html',
	'.css',
	'.scss',
	'.vue',
	'.svelte',
] as const;

export function normalizeAgentInputFiles(value: unknown): AgentInputFile[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new Error('Attachments must be an array.');
	if (value.length > AGENT_MAX_ATTACHMENT_COUNT) {
		throw new Error(`A maximum of ${AGENT_MAX_ATTACHMENT_COUNT} attachments is allowed.`);
	}
	const files: AgentInputFile[] = [];
	let totalBytes = 0;
	for (const item of value) {
		if (!item || typeof item !== 'object' || Array.isArray(item))
			throw new Error('Each attachment must include a name, MIME type, and base64 data.');
		const { name, mimeType, data } = item as Record<string, unknown>;
		if (typeof name !== 'string' || typeof mimeType !== 'string' || typeof data !== 'string')
			throw new Error('Each attachment must include a name, MIME type, and base64 data.');
		const normalizedData = data.trim();
		if (!name || !mimeType.trim() || !normalizedData)
			throw new Error('Each attachment must include a name, MIME type, and base64 data.');
		if (
			normalizedData.length > Math.ceil(AGENT_MAX_ATTACHMENT_BYTES / 3) * 4 ||
			normalizedData.length % 4 === 1 ||
			!/^[a-zA-Z0-9+/]*={0,2}$/.test(normalizedData)
		) {
			throw new Error('Attachment data must be valid bounded base64.');
		}
		const decodedBytes = Buffer.from(normalizedData, 'base64').byteLength;
		if (decodedBytes > AGENT_MAX_ATTACHMENT_BYTES) {
			throw new Error(`Each attachment must be at most ${AGENT_MAX_ATTACHMENT_BYTES} bytes.`);
		}
		totalBytes += decodedBytes;
		if (totalBytes > AGENT_MAX_ATTACHMENT_TOTAL_BYTES) {
			throw new Error(`Attachments must total at most ${AGENT_MAX_ATTACHMENT_TOTAL_BYTES} bytes.`);
		}
		files.push({ name, mimeType: mimeType.trim(), data: normalizedData });
	}
	return files.length > 0 ? files : undefined;
}
