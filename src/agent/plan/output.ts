export function isPlanOutputValid(content: string): boolean {
	const value = content.trim();
	const opening = '<proposed_plan>';
	const closing = '</proposed_plan>';
	if (!value.startsWith(opening) || !value.endsWith(closing)) return false;
	if (value.indexOf(opening, opening.length) !== -1) return false;
	if (value.indexOf(closing) !== value.length - closing.length) return false;
	return value.slice(opening.length, -closing.length).trim().length > 0;
}
