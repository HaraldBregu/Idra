import type { WorkspaceTreeEntry } from '@friday/sdk';

export function removeWorkspaceEntry(
	entries: WorkspaceTreeEntry[],
	filePath: string
): WorkspaceTreeEntry[] {
	return entries
		.filter((entry) => entry.path !== filePath)
		.map((entry) =>
			entry.children
				? { ...entry, children: removeWorkspaceEntry(entry.children, filePath) }
				: entry
		);
}
