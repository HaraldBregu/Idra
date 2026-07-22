export function isProjectToolType(type: string): boolean {
	const normalized = type.toLowerCase();
	return (
		normalized.startsWith('project_') ||
		normalized.endsWith('_project') ||
		normalized.endsWith('_projects')
	);
}
