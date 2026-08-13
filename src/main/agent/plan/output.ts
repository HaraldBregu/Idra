export function isPlanOutputValid(content: string): boolean {
	return /^\s*<proposed_plan>\s*[\s\S]*\S[\s\S]*<\/proposed_plan>\s*$/.test(content);
}
