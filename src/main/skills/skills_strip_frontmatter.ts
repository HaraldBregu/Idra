export function stripFrontmatter(content: string): string {
	const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
	return match ? content.slice(match[0].length).trim() : content.trim();
}
