export function stringArg(args: Record<string, unknown>, names: string[]): string {
	for (const name of names) {
		const value = args[name];
		if (typeof value === 'string') {
			return value.trim();
		}
	}
	return '';
}
