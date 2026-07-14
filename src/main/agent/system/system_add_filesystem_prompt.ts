import type { Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Config } from '../types';

export async function addFilesystemPrompt(config: Config, prompt: string): Promise<string> {
	const root = path.resolve(config.location);
	const directories = [''];
	const paths: string[] = [];
	const unavailableDirectories: string[] = [];

	while (directories.length > 0) {
		const relativeDirectory = directories.shift() ?? '';
		let entries: Dirent[];
		try {
			entries = await fs.readdir(path.join(root, relativeDirectory), { withFileTypes: true });
		} catch {
			const displayDirectory = relativeDirectory.split(path.sep).join(path.posix.sep);
			unavailableDirectories.push(displayDirectory ? `${displayDirectory}/` : '.');
			continue;
		}

		for (const entry of entries) {
			const relativePath = path.join(relativeDirectory, entry.name);
			const displayPath = relativePath.split(path.sep).join(path.posix.sep);
			if (entry.isDirectory()) {
				paths.push(`${displayPath}/`);
				directories.push(relativePath);
			} else {
				paths.push(displayPath);
			}
		}
	}

	paths.sort();
	unavailableDirectories.sort();

	prompt += '\n\n## Agent filesystem';
	prompt += `\nRoot directory: ${JSON.stringify(root)}`;
	prompt += '\nThis inventory is refreshed before every model turn and contains path names only, not file contents.';
	prompt += '\nPaths are relative to the root directory. Folder paths end with `/`.';
	if (paths.length === 0 && unavailableDirectories.length === 0) return `${prompt}\n- (empty)`;
	for (const filePath of paths) prompt += `\n- ${JSON.stringify(filePath)}`;
	for (const directory of unavailableDirectories)
		prompt += `\n- ${JSON.stringify(directory)} (unavailable)`;
	return prompt;
}
