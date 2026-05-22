import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { TOOL_LIMITS } from '../core/limits';

export const webFetchTool: AgentTool<{ url: string }> = {
	name: 'web_fetch',
	description: 'Fetch an http(s) URL and return readable text. Response is capped at 1MB.',
	schema: {
		type: 'object',
		properties: {
			url: { type: 'string', description: 'HTTP or HTTPS URL to fetch.' },
		},
		required: ['url'],
		additionalProperties: false,
	},
	async execute(args) {
		let url: URL;
		try {
			url = new URL(String(args.url ?? ''));
		} catch {
			return textResult('web_fetch: invalid URL', true);
		}
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return textResult('web_fetch: only http(s) URLs are allowed', true);
		}
		try {
			const response = await fetch(url);
			const contentType = response.headers.get('content-type') ?? '';
			const raw = (await response.text()).slice(0, TOOL_LIMITS.webFetch.maxResponseBytes);
			const text = contentType.includes('html') ? stripHtml(raw) : raw;
			return {
				...textResult(text),
				status: response.ok ? 'ok' : 'error',
				details: { status: response.status, url: url.toString() },
			};
		} catch (err) {
			return textResult(`web_fetch: ${(err as Error).message}`, true);
		}
	},
};

function stripHtml(html: string): string {
	return html
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();
}
