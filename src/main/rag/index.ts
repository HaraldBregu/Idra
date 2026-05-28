import {
	WORKSPACE_MEMORY_DIR,
	relativeWorkspacePath,
	splitRelativeMemoryPath,
} from '../memory/path';

export interface RagFileDescriptor {
	corpus: 'rag';
	scopeKind: 'global';
	scopeId: 'rag';
	relativePath: string;
}

const RAG_DIRNAME = 'rag';

export function describeRagFile(workspaceDir: string, filePath: string): RagFileDescriptor | undefined {
	const relativePath = relativeWorkspacePath(workspaceDir, filePath);
	if (!relativePath) return undefined;
	const parts = splitRelativeMemoryPath(relativePath);
	if (parts[0] !== WORKSPACE_MEMORY_DIR || parts[1] !== RAG_DIRNAME || parts.length < 3) {
		return undefined;
	}
	return {
		corpus: 'rag',
		scopeKind: 'global',
		scopeId: 'rag',
		relativePath,
	};
}
