import { Tool } from '../core/tool';
import { runWebFetch } from './web-fetch/runtime';

const DEFAULT_MAX_CHARS = 50_000;

export class WebFetchTool extends Tool {
	readonly name = 'web_fetch';
	readonly label = 'Web Fetch';
	readonly description =
		'Fetch the content of an HTTP(S) URL. Returns the page as markdown or plain text. ' +
		'Falls back to Jina or Firecrawl if direct fetch fails.';
	readonly schema = {
		type: 'object',
		required: ['url'],
		additionalProperties: false,
		properties: {
			url: {
				type: 'string',
				description: 'HTTP(S) URL to fetch.',
			},
			extractMode: {
				type: 'string',
				enum: ['markdown', 'text'],
				description: 'How to extract content from HTML pages (default: "markdown").',
			},
			maxChars: {
				type: 'number',
				description: `Maximum characters to return (default: ${DEFAULT_MAX_CHARS}).`,
			},
		},
	};

	async run(input: Record<string, unknown>): Promise<unknown> {
		const url = input.url;
		if (typeof url !== 'string' || !url.trim()) {
			throw new Error('web_fetch requires a non-empty url.');
		}

		const extractModeRaw = input.extractMode;
		const extractMode =
			extractModeRaw === 'text' ? 'text' : 'markdown';

		const maxChars =
			typeof input.maxChars === 'number' && input.maxChars > 0
				? Math.floor(input.maxChars)
				: DEFAULT_MAX_CHARS;

		return runWebFetch({ url: url.trim(), extractMode, maxChars });
	}
}
