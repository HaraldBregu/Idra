import path from 'node:path';
import { wikiLocation } from './wiki_location';

export interface WikiPaths {
	root: string;
	evidence: string;
	state: string;
	config: string;
}

export function wikiPaths(): WikiPaths {
	const root = wikiLocation();
	return {
		root,
		evidence: path.resolve(root, 'evidence', 'documents'),
		state: path.resolve(root, 'state'),
		config: path.resolve(root, 'config'),
	};
}
