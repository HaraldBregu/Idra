import {
	llmBuildAnthropicMessages,
	llmBuildChatMessages,
	llmBuildResponseInput,
	llmToTranscriptEntry,
} from '../../../../src/main/models/adapters/llm/llm_shared';
import type { LlmTranscriptEntry } from '../../../../src/main/models/adapters/llm/llm_types';

const image = { type: 'image' as const, mimeType: 'image/webp', base64: 'aW1hZ2U=' };
const pdf = {
	type: 'document' as const,
	name: 'brief.pdf',
	mimeType: 'application/pdf' as const,
	base64: 'cGRm',
};
const transcript = (block: typeof image | typeof pdf): LlmTranscriptEntry[] => [
	{ role: 'user', content: [block] },
];

describe('LLM attachment payload builders', () => {
	it('serializes explicit image and PDF blocks for OpenAI Responses', () => {
		expect(llmBuildResponseInput([{ role: 'user', content: [image, pdf] }])).toEqual([
			{
				role: 'user',
				content: [
					{
						type: 'input_image',
						image_url: 'data:image/webp;base64,aW1hZ2U=',
						detail: 'auto',
					},
					{
						type: 'input_file',
						filename: 'brief.pdf',
						file_data: 'data:application/pdf;base64,cGRm',
					},
				],
			},
		]);
	});

	it('serializes Anthropic images and PDFs with their verified MIME types', () => {
		expect(llmBuildAnthropicMessages([{ role: 'user', content: [image, pdf] }])).toEqual([
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: 'image/webp', data: 'aW1hZ2U=' },
					},
					{
						type: 'document',
						source: { type: 'base64', media_type: 'application/pdf', data: 'cGRm' },
					},
				],
			},
		]);
	});

	it('allows image_url but rejects documents for generic compatible chat', () => {
		expect(llmBuildChatMessages('', transcript(image))).toEqual([
			{
				role: 'user',
				content: [
					{
						type: 'image_url',
						image_url: { url: 'data:image/webp;base64,aW1hZ2U=' },
					},
				],
			},
		]);
		expect(() => llmBuildChatMessages('', transcript(pdf))).toThrow(
			'brief.pdf: this chat adapter does not support document attachments.'
		);
	});

	it('uses Reka pdf_url only for the targeted chat profile', () => {
		expect(llmBuildChatMessages('', transcript(pdf), { contentProfile: 'reka' })).toEqual([
			{
				role: 'user',
				content: [
					{
						type: 'pdf_url',
						pdf_url: { url: 'data:application/pdf;base64,cGRm' },
					},
				],
			},
		]);
	});

	it('rejects unsupported image MIME types instead of silently coercing them', () => {
		const gif = { type: 'image' as const, mimeType: 'image/gif', base64: 'R0lG' };
		expect(() => llmBuildResponseInput(transcript(gif as typeof image))).toThrow(
			'unsupported image MIME type image/gif'
		);
		expect(() => llmBuildAnthropicMessages(transcript(gif as typeof image))).toThrow(
			'unsupported image MIME type image/gif'
		);
		expect(() => llmBuildChatMessages('', transcript(gif as typeof image))).toThrow(
			'unsupported image MIME type image/gif'
		);
	});

	it('keeps local text files as separate labeled user text blocks', () => {
		expect(
			llmToTranscriptEntry({
				role: 'user',
				content: [
					{ type: 'text', text: 'Review this file.' },
					{
						type: 'text_file',
						name: 'config.toml',
						mimeType: 'text/plain',
						bytes: 8,
						text: 'enabled=true',
					},
				],
			})
		).toEqual([
			{
				role: 'user',
				content: [
					{ type: 'text', text: 'Review this file.' },
					{
						type: 'text',
						text: [
							'[Uploaded text file]',
							'Name: config.toml',
							'MIME type: text/plain',
							'Size: 8 bytes',
							'The complete file content is included inline below. Read it directly from this block; the name is metadata, not a filesystem path, and no file tool is needed.',
							'--- BEGIN UPLOADED FILE: config.toml ---',
							'enabled=true',
							'--- END UPLOADED FILE: config.toml ---',
						].join('\n'),
					},
				],
			},
		]);
	});

	it('rejects unknown semantic blocks instead of silently dropping them', () => {
		expect(() =>
			llmToTranscriptEntry({
				role: 'user',
				content: [{ type: 'audio', mimeType: 'audio/mpeg', base64: 'YXVkaW8=' }],
			})
		).toThrow('Unsupported user content block: audio.');
	});
});
