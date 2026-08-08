export function workspaceEntryName(name: string): string {
	const normalizedName = name.trim();
	if (
		!normalizedName ||
		normalizedName === '.' ||
		normalizedName === '..' ||
		/[\\/\0]/.test(normalizedName)
	) {
		throw new Error('Enter a valid name without path separators.');
	}
	return normalizedName;
}
