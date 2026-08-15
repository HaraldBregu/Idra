import type { FileAccessContext } from './context_types';

export function hasToolPermission(
	context: FileAccessContext | undefined,
	directory: string
): boolean {
	return context?.readDirectories.has(directory) ?? false;
}
