import fs from 'node:fs';
import path from 'node:path';
import {
	SKILL_PACKAGE_MAX_BYTES,
	SKILL_PACKAGE_MAX_DEPTH,
	SKILL_PACKAGE_MAX_FILES,
	SKILL_RESOURCE_MAX_BYTES,
} from './skills_limits';
import { resolveSkillResource } from './skills_resolve_resource';

export function validateSkillPackage(root: string): void {
	const canonicalRoot = fs.realpathSync(root);
	const pending = [{ directory: canonicalRoot, depth: 0 }];
	let files = 0;
	let bytes = 0;
	while (pending.length > 0) {
		const current = pending.pop() as { directory: string; depth: number };
		if (current.depth > SKILL_PACKAGE_MAX_DEPTH)
			throw new Error(`Skill package exceeds the maximum depth of ${SKILL_PACKAGE_MAX_DEPTH}.`);
		for (const entry of fs.readdirSync(current.directory, { withFileTypes: true })) {
			const absolutePath = path.join(current.directory, entry.name);
			if (entry.isSymbolicLink()) {
				const relativePath = path.relative(canonicalRoot, absolutePath);
				resolveSkillResource(canonicalRoot, relativePath);
			}
			if (entry.isDirectory()) {
				pending.push({ directory: absolutePath, depth: current.depth + 1 });
				continue;
			}
			if (!entry.isFile() && !entry.isSymbolicLink())
				throw new Error(`Skill package contains unsupported file type: ${entry.name}.`);
			const size = fs.statSync(absolutePath).size;
			if (size > SKILL_RESOURCE_MAX_BYTES)
				throw new Error(
					`Skill resource exceeds the ${SKILL_RESOURCE_MAX_BYTES}-byte limit: ${entry.name}.`
				);
			files += 1;
			bytes += size;
			if (files > SKILL_PACKAGE_MAX_FILES)
				throw new Error(`Skill package exceeds the ${SKILL_PACKAGE_MAX_FILES}-file limit.`);
			if (bytes > SKILL_PACKAGE_MAX_BYTES)
				throw new Error(`Skill package exceeds the ${SKILL_PACKAGE_MAX_BYTES}-byte limit.`);
		}
	}
}
