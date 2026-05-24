import {
	WORKSPACE_MEMORY_DIR,
	relativeWorkspacePath,
	splitRelativeMemoryPath,
} from '../memory/path';

export interface WikiFileDescriptor {
	corpus: 'wiki';
	scopeKind: 'global';
	scopeId: 'wiki';
	relativePath: string;
}

const WIKI_DIRNAME = 'wiki';

export function describeWikiFile(workspaceDir: string, filePath: string): WikiFileDescriptor | undefined {
	const relativePath = relativeWorkspacePath(workspaceDir, filePath);
	if (!relativePath) return undefined;
	const parts = splitRelativeMemoryPath(relativePath);
	if (parts[0] !== WORKSPACE_MEMORY_DIR || parts[1] !== WIKI_DIRNAME || parts.length < 3) {
		return undefined;
	}
	return {
		corpus: 'wiki',
		scopeKind: 'global',
		scopeId: 'wiki',
		relativePath,
	};
}
