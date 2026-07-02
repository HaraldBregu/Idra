import fs from 'node:fs';
import { shell } from 'electron';
import { skillsRoot } from './skills_root';

export async function openRoot(): Promise<void> {
	fs.mkdirSync(skillsRoot, { recursive: true });
	const error = await shell.openPath(skillsRoot);
	if (error) throw new Error(error);
}
