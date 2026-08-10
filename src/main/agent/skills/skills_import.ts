import fs from 'node:fs';
import path from 'node:path';
import type {
	SkillImportResult,
	SkillImportSkipped,
	SkillInfo,
} from '../../../shared/skills_types';
import { skillsRoot } from './skills_root';
import { readSkill } from './skills_read';
import { pickDirectories } from './skills_pick_directories';
import { validateSkill } from './skills_validate';
import { validateSkillPackage } from './skills_validate_package';
import { setSkillPolicy } from './skills_policy_set';

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
		if (fs.existsSync(destination)) {
			skipped.push({
				name: id,
				sourcePath: source,
				reason: 'A skill with this name already exists. Delete it before importing a replacement.',
			});
			continue;
		}
		const temporaryParent = path.join(skillsRoot, `.import-${id}-${crypto.randomUUID()}`);
		const temporary = path.join(temporaryParent, id);
		let installed = false;
		try {
			validateSkillPackage(source);
			fs.mkdirSync(temporaryParent);
			fs.cpSync(source, temporary, { recursive: true, errorOnExist: true });
			validateSkillPackage(temporary);
			const stagedValidation = validateSkill(temporary);
			if (!stagedValidation.valid)
				throw new Error(stagedValidation.issues.map((issue) => issue.message).join('; '));
			setSkillPolicy(id, {
				enabled: false,
				trusted: false,
				invocationPolicy: 'explicit',
				origin: source,
			});
			fs.renameSync(temporary, destination);
			installed = true;
			fs.rmSync(temporaryParent, { recursive: true, force: true });
			const info = readSkill(destination, id);
			if (!info) throw new Error('Imported skill could not be read after installation.');
			imported.push(info);
		} catch (error) {
			if (installed) fs.rmSync(destination, { recursive: true, force: true });
			fs.rmSync(temporaryParent, { recursive: true, force: true });
			skipped.push({
				name: id,
				sourcePath: source,
				reason: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return { imported, skipped };
}
