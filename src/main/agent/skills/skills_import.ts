import fs from 'node:fs';
import path from 'node:path';
import type { SkillImportResult, SkillImportSkipped, SkillInfo } from '../../../shared/skills_types';
import { skillsRoot } from './skills_root';
import { readSkill } from './skills_read';
import { pickDirectories } from './skills_pick_directories';
import { validateSkill } from './skills_validate';

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
		const id = readSkill(source, path.basename(source))?.name ?? path.basename(source);
		const destination = path.join(skillsRoot, id);
		fs.rmSync(destination, { recursive: true, force: true });
		fs.cpSync(source, destination, { recursive: true });
		const info = readSkill(destination, id);
		if (info) imported.push(info);
	}

	return { imported, skipped };
}
