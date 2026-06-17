function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, ' ')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTag(html: string, tag: string): string {
	return html.replace(new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
}

export function htmlToMarkdown(html: string): string {
	let s = html;
	s = stripTag(s, 'script');
	s = stripTag(s, 'style');
	s = stripTag(s, 'head');
	s = stripTag(s, 'nav');
	s = stripTag(s, 'footer');
	s = stripTag(s, 'aside');

	// Headings
	s = s.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, (_, t) => `\n# ${decodeEntities(t.replace(/<[^>]*>/g, '').trim())}\n`);
	s = s.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n## ${decodeEntities(t.replace(/<[^>]*>/g, '').trim())}\n`);
	s = s.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n### ${decodeEntities(t.replace(/<[^>]*>/g, '').trim())}\n`);
	s = s.replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, (_, t) => `\n#### ${decodeEntities(t.replace(/<[^>]*>/g, '').trim())}\n`);

	// Inline formatting
	s = s.replace(/<(strong|b)[^>]*>([\s\S]*?)<\/(strong|b)>/gi, (_, _t, c) => `**${c}**`);
	s = s.replace(/<(em|i)[^>]*>([\s\S]*?)<\/(em|i)>/gi, (_, _t, c) => `*${c}*`);
	s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => `\`${c}\``);

	// Links and images
	s = s.replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => {
		const label = text.replace(/<[^>]*>/g, '').trim();
		return label ? `[${label}](${href})` : href;
	});
	s = s.replace(/<img[^>]*alt="([^"]*)"[^>]*/gi, (_, alt) => (alt ? `[${alt}]` : ''));

	// Lists
	s = s.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, c) => `\n- ${c.replace(/<[^>]*>/g, '').trim()}`);
	s = s.replace(/<\/[ou]l>/gi, '\n');

	// Block elements → newlines
	s = s.replace(/<\/?(p|div|section|article|header|main)[^>]*>/gi, '\n');
	s = s.replace(/<br\s*\/?>/gi, '\n');
	s = s.replace(/<hr\s*\/?>/gi, '\n---\n');

	// Strip remaining tags
	s = s.replace(/<[^>]*>/g, '');

	s = decodeEntities(s);
	s = s.replace(/\n{3,}/g, '\n\n').trim();
	return s;
}

export function htmlToText(html: string): string {
	let s = html;
	s = stripTag(s, 'script');
	s = stripTag(s, 'style');
	s = stripTag(s, 'head');
	s = s.replace(/<br\s*\/?>/gi, '\n');
	s = s.replace(/<\/?(p|div|li|h[1-6]|section|article|tr)[^>]*>/gi, '\n');
	s = s.replace(/<[^>]*>/g, '');
	s = decodeEntities(s);
	s = s.replace(/\n{3,}/g, '\n\n').trim();
	return s;
}
