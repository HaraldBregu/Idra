export function updateModelOptions(
	values: Readonly<Record<string, unknown>>,
	path: readonly string[],
	value: unknown
): Record<string, unknown> {
	const next = structuredClone(values);
	let target = next;
	for (const key of path.slice(0, -1)) {
		const current = target[key];
		target[key] = current && typeof current === 'object' ? { ...current } : {};
		target = target[key] as Record<string, unknown>;
	}
	const key = path.at(-1);
	if (!key) return next;
	if (value === undefined || value === '') delete target[key];
	else target[key] = value;
	for (let index = path.length - 2; index >= 0; index -= 1) {
		let parent: Record<string, unknown> = next;
		for (const part of path.slice(0, index)) {
			parent = parent[part] as Record<string, unknown>;
		}
		const child = parent[path[index]];
		if (child && typeof child === 'object' && Object.keys(child).length === 0) {
			delete parent[path[index]];
		}
	}
	return next;
}
