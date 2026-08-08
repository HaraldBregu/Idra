import type { AgentInputFile } from './agent_types';

export const AGENT_MAX_ATTACHMENT_COUNT = 10;
export const AGENT_MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const AGENT_MAX_ATTACHMENT_TOTAL_BYTES = 50 * 1024 * 1024;

export function normalizeAgentInputFiles(value: unknown): AgentInputFile[] | undefined {
	if (!Array.isArray(value)) return undefined;
	if (value.length > AGENT_MAX_ATTACHMENT_COUNT) {
		throw new Error(`A maximum of ${AGENT_MAX_ATTACHMENT_COUNT} attachments is allowed.`);
	}
	const files: AgentInputFile[] = [];
	let totalBytes = 0;
	for (const item of value) {
		if (!item || typeof item !== 'object') continue;
		const { name, mimeType, data } = item as Record<string, unknown>;
		if (typeof name !== 'string' || typeof mimeType !== 'string' || typeof data !== 'string')
			continue;
		const normalizedData = data.trim();
		if (!mimeType.trim() || !normalizedData) continue;
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
			throw new Error(
				`Attachments must total at most ${AGENT_MAX_ATTACHMENT_TOTAL_BYTES} bytes.`
			);
		}
		files.push({ name, mimeType: mimeType.trim(), data: normalizedData });
	}
	return files.length > 0 ? files : undefined;
}
