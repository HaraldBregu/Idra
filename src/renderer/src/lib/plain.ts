import { marked } from 'marked';

export function markdownToPlainText(markdown: string): string {
	const html = marked.parse(markdown, { async: false }) as string;
	const doc = new DOMParser().parseFromString(html, 'text/html');
	return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}
