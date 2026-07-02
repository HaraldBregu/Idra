import fs from 'node:fs';
import path from 'node:path';
import type { SkillImportResult, SkillImportSkipped, SkillInfo } from '../../../shared/skills.types';
import { setSkill } from './skills-store';
import { skillsRoot } from './skills-root';
import { readSkill } from './skills-read';
import { pickDirectories } from './skills-pick-directories';
import { slug } from './skills-slug';
import { validateSkill } from './skills-validate';

export async function importSkills(): Promise<SkillImportResult | undefined> {
	const sources = await pickDirectories({
		title: 'Select skill folder(s) to upload',
		properties: ['openDirectory', 'multiSelections'],
	});
	if (!sources) return undefined;

	fs.mkdirSync(skillsRoot, { recursive: true });
	const imported: SkillInfo[] = [];
	const skipped: SkillImportSkipped[] = [];

	for (const source of sources) {
		const validation = validateSkill(source);
		if (!validation.valid) {
			skipped.push({
				name: path.basename(source),
				sourcePath: source,
				reason: validation.issues.map((issue) => issue.message).join('; '),
			});
			continue;
		}
		const id = slug(path.basename(source));
		const destination = path.join(skillsRoot, id);
		fs.rmSync(destination, { recursive: true, force: true });
		fs.cpSync(source, destination, { recursive: true });
		setSkill(id, { enabled: true });
		const info = readSkill(destination, id);
		if (info) imported.push(info);
	}

	return { imported, skipped };
}
