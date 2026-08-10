import fs from 'node:fs';
import path from 'node:path';

export function resolveSkillResource(canonicalRoot: string, relativePath: string): string {
	if (!relativePath || relativePath.includes('\0') || path.isAbsolute(relativePath) || /^[a-z]:[\\/]/i.test(relativePath)) {
		throw new Error('Skill resource path must be a non-empty relative path.');
	}
	const root = fs.realpathSync(canonicalRoot);
	const unresolved = path.resolve(root, relativePath);
	const unresolvedRelative = path.relative(root, unresolved);
	if (
		unresolvedRelative === '..' ||
		unresolvedRelative.startsWith(`..${path.sep}`) ||
		path.isAbsolute(unresolvedRelative)
	) {
		throw new Error(`Skill resource "${relativePath}" resolves outside its skill root.`);
	}
	const candidate = fs.realpathSync(unresolved);
	const relative = path.relative(root, candidate);
	if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
		throw new Error(`Skill resource "${relativePath}" resolves outside its skill root.`);
	}
	if (!fs.statSync(candidate).isFile()) throw new Error(`Skill resource "${relativePath}" is not a file.`);
	return candidate;
}
