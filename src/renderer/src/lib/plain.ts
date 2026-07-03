import { marked, type Token } from 'marked';

function collectPlainText(tokens: readonly Token[]): string[] {
	const parts: string[] = [];
	for (const token of tokens) {
		if (token.type === 'code' || token.type === 'space') continue;
		if ('tokens' in token && Array.isArray(token.tokens) && token.tokens.length > 0) {
			parts.push(...collectPlainText(token.tokens));
			continue;
		}
		if ('items' in token && Array.isArray(token.items)) {
			parts.push(...collectPlainText(token.items));
			continue;
		}
		if ('text' in token && typeof token.text === 'string') {
			parts.push(token.text);
		}
	}
	return parts;
}

export function markdownToPlainText(markdown: string): string {
	return collectPlainText(marked.lexer(markdown)).join(' ').replace(/\s+/g, ' ').trim();
}
