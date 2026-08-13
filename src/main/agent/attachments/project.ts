import path from 'node:path';
import type { AgentPromptInputCapabilities } from '../../../shared/agent_types';
import type { Message } from '../types';
import { formatUploadedTextFile } from './text';

export function projectPromptAttachments(
	messages: readonly Message[],
	capabilities: AgentPromptInputCapabilities
): Message[] {
	return messages.map((message) => {
		if (!Array.isArray(message.content)) return message;
		return {
			...message,
			content: message.content.map((block) => {
				if (block.type === 'text_file' && typeof block.text === 'string') {
					return {
						type: 'text',
						text: formatUploadedTextFile({
							name: String(block.name),
							mimeType: String(block.mimeType),
							bytes: Number(block.bytes),
							text: block.text,
						}),
					};
				}
				const legacyDocument = block.type === 'file' && block.mimeType === 'application/pdf';
				if (block.type !== 'image' && block.type !== 'document' && !legacyDocument) return block;
				const kind = block.type === 'image' ? 'image' : 'document';
				const name = typeof block.name === 'string' ? block.name : 'unnamed';
				const mimeType = typeof block.mimeType === 'string' ? block.mimeType : 'unknown';
				const extension = path.extname(name).toLowerCase();
				const supported = capabilities.rules.some(
					(rule) =>
						rule.kind === kind &&
						rule.mimeTypes.includes(mimeType) &&
						rule.extensions.includes(extension)
				);
				if (supported) return legacyDocument ? { ...block, type: 'document' } : block;
				const bytes =
					typeof block.bytes === 'number'
						? block.bytes
						: typeof block.base64 === 'string'
							? Buffer.from(block.base64, 'base64').length
							: 0;
				return {
					type: 'text',
					text: `[Historical attachment unavailable for this model: ${name}; ${kind}; ${mimeType}; ${bytes} bytes]`,
				};
			}),
		};
	});
}
