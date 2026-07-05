const DELETE_HUNK = /^\*\*\* Delete File: /m;
const UPDATE_HUNK = /^\*\*\* Update File: /m;

export function patchOnlyAddsFiles(args: Record<string, unknown>): boolean {
	const input = args.input;
	if (typeof input !== 'string') return false;
	return !DELETE_HUNK.test(input) && !UPDATE_HUNK.test(input);
}
