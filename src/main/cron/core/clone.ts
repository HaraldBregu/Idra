/** Deep clones a JSON-serializable value to isolate stored state from callers. */
export function clone<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
