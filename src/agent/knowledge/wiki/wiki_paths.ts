import { createHash } from 'node:crypto';
import path from 'node:path';
import { realPath } from '../../../shared/real_path';
import { wikiLocation } from './wiki_location';
import type { WikiPaths } from './types';

export function wikiPaths(targetPath?: string): WikiPaths {
	const defaultRoot = wikiLocation();
	const defaultTarget = realPath(path.resolve(defaultRoot, 'data'));
	const canonicalTarget = targetPath ? realPath(targetPath) : defaultTarget;
	const root =
		canonicalTarget === defaultTarget
			? defaultRoot
			: path.resolve(
					defaultRoot,
					'targets',
					createHash('sha256').update(canonicalTarget).digest('hex')
				);
	return {
		root,
		evidence: path.resolve(root, 'evidence', 'documents'),
		state: path.resolve(root, 'state'),
		config: path.resolve(root, 'config'),
	};
}
