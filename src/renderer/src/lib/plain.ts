import { marked, type Token } from 'marked';

function collectPlainText(tokens: readonly Token[]): string[] {
	const parts: string[] = [];
	for (const token of tokens) {
		if (token.type === 'code' || token.type === 'space') continue;
		if ('text' in token && typeof token.text === 'string') {
			parts.push(token.text);
		}
		if ('tokens' in token && Array.isArray(token.tokens)) {
			parts.push(...collectPlainText(token.tokens));
		}
	}
	return parts;
}

export function markdownToPlainText(markdown: string): string {
	return collectPlainText(marked.lexer(markdown)).join(' ').replace(/\s+/g, ' ').trim();
}
