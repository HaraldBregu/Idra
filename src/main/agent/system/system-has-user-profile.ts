export function hasUserProfile(userText: string): boolean {
	return userText
		.split('\n')
		.map((line) => line.trim())
		.some((line) => {
			const field = line.match(/^-\s+\*\*[^:]+:\*\*\s*(.+)$/);
			return field ? field[1].trim().length > 0 : false;
		});
}
