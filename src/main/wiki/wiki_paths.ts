import path from 'node:path';
import { wikiLocation } from './wiki_location';

export interface WikiPaths {
	root: string;
	evidence: string;
	state: string;
	config: string;
}

export function wikiPaths(targetPath?: string): WikiPaths {
	const defaultRoot = wikiLocation();
	const relative = targetPath ? path.relative(defaultRoot, targetPath) : '';
	const root =
		targetPath && (relative.startsWith('..') || path.isAbsolute(relative))
			? path.dirname(targetPath)
			: defaultRoot;
	return {
		root,
		evidence: path.resolve(root, 'evidence', 'documents'),
		state: path.resolve(root, 'state'),
		config: path.resolve(root, 'config'),
	};
}
