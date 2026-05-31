import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { checkFilePath } from '../permissions/filesystem';
import type { Tool } from './tool';
import { hash } from './hash';

export const filePathSchema = z.object({
	path: z.string().min(1),
});

export function createReadFileTool(): Tool<z.infer<typeof filePathSchema>, string> {
	return {
		name: 'ReadFile',
		description: 'Read a UTF-8 text file and record its hash for safe future edits.',
		inputSchema: filePathSchema,
		async prompt() {
			return 'Read files before writing them.';
		},
		checkPermissions(input, context) {
			return checkFilePath(input.path, context);
		},
		async call(input, context) {
			const path = resolve(input.path);
			const content = await readFile(path, 'utf8');
			const info = await stat(path);
			context.setState((prev) => {
				const readFileState = new Map(prev.readFileState);
				readFileState.set(path, {
					timestamp: info.mtimeMs,
					hash: hash(content),
					isPartialView: false,
				});
				return { ...prev, readFileState };
			});
			return { data: content, content };
		},
		isReadOnly() {
			return true;
		},
	};
}
