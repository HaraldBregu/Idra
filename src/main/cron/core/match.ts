/** Returns true when a candidate matches an expected value or set of values. */
export function matchesValue<T extends string>(
	candidate: T | undefined,
	expected: T | T[] | undefined
): boolean {
	if (!expected) return true;
	if (!candidate) return false;
	return Array.isArray(expected) ? expected.includes(candidate) : candidate === expected;
}
