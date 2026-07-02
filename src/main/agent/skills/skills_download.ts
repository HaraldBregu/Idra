import fs from 'node:fs';
import path from 'node:path';
import type { SkillDownloadResult } from '../../../shared/skills_types';
import { readSkill } from './skills_read';
import { resolveSkillFolder } from './skills_resolve_folder';
import { pickDirectories } from './skills_pick_directories';

export async function downloadSkill(id: string): Promise<SkillDownloadResult | undefined> {
	const folder = resolveSkillFolder(id);
	if (!fs.existsSync(folder)) throw new Error(`Skill "${id}" not found.`);
	const targets = await pickDirectories({
		title: 'Choose where to download the skill',
		properties: ['openDirectory', 'createDirectory'],
	});
	if (!targets) return undefined;
	const destination = path.join(targets[0], id);
	fs.cpSync(folder, destination, { recursive: true });
	return { id, destinationPath: destination, name: readSkill(folder, id)?.name };
}
