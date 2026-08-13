import type { AgentPromptInputCapabilities } from '@shared/agent_types';
import type { PromptAttachment } from './types';

const TEXT_EXTENSIONS = new Set([
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
]);

export function validatePromptAttachments(
	attachments: readonly PromptAttachment[],
	capabilities: AgentPromptInputCapabilities | null
): PromptAttachment[] {
	if (!capabilities) {
		return attachments.map((attachment) => ({
			...attachment,
			error: 'No compatible assistant model is selected.',
		}));
	}

	let binaryBytes = 0;
	let textBytes = 0;
	const ruleCounts = new Map<number, number>();
	const ruleBytes = new Map<number, number>();

	return attachments.map((attachment, index) => {
		const file = attachment.file;
		const extensionIndex = file.name.lastIndexOf('.');
		const extension = extensionIndex >= 0 ? file.name.slice(extensionIndex).toLowerCase() : '';
		let error: string | undefined;

		if (index >= capabilities.limits.maxFiles) {
			error = `A maximum of ${capabilities.limits.maxFiles} attachments is allowed.`;
		} else if (TEXT_EXTENSIONS.has(extension)) {
			textBytes += file.size;
			if (file.size > capabilities.limits.maxTextBytes) {
				error = `Text files must be ${capabilities.limits.maxTextBytes.toLocaleString()} bytes or smaller.`;
			} else if (textBytes > capabilities.limits.maxTextTotalBytes) {
				error = `Text attachments must total ${capabilities.limits.maxTextTotalBytes.toLocaleString()} bytes or less.`;
			}
		} else {
			const mimeType = file.type.trim().toLowerCase();
			const ruleIndex = capabilities.rules.findIndex(
				(rule) =>
					rule.mimeTypes.some((value) => value.toLowerCase() === mimeType) &&
					rule.extensions.some((value) => value.toLowerCase() === extension)
			);
			const rule = capabilities.rules[ruleIndex];
			if (!rule) {
				error = 'This file type is not supported by the selected model.';
			} else {
				binaryBytes += file.size;
				const count = (ruleCounts.get(ruleIndex) ?? 0) + 1;
				const bytes = (ruleBytes.get(ruleIndex) ?? 0) + file.size;
				ruleCounts.set(ruleIndex, count);
				ruleBytes.set(ruleIndex, bytes);
				const maxBytes = Math.min(
					capabilities.limits.maxBinaryBytes,
					rule.maxBytes ?? Number.POSITIVE_INFINITY
				);
				const maxTotalBytes = Math.min(
					capabilities.limits.maxBinaryTotalBytes,
					rule.maxTotalBytes ?? Number.POSITIVE_INFINITY
				);
				if (file.size > maxBytes) {
					error = `This file must be ${maxBytes.toLocaleString()} bytes or smaller.`;
				} else if (binaryBytes > capabilities.limits.maxBinaryTotalBytes || bytes > maxTotalBytes) {
					error = `Binary attachments must total ${maxTotalBytes.toLocaleString()} bytes or less.`;
				} else if (rule.maxFiles !== undefined && count > rule.maxFiles) {
					error = `This model accepts at most ${rule.maxFiles} ${rule.kind} files.`;
				}
			}
		}

		return { ...attachment, ...(error ? { error } : { error: undefined }) };
	});
}
