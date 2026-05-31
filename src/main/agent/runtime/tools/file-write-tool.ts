import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { checkFilePath } from '../permissions/filesystem';
import type { Tool } from './Tool';
import { filePathSchema } from './file-read-tool';
import { hash } from './hash';

const writeFileSchema = filePathSchema.extend({
	content: z.string(),
});

export function createWriteFileTool(): Tool<z.infer<typeof writeFileSchema>, { path: string }> {
	return {
		name: 'WriteFile',
		description: 'Write a UTF-8 text file only after it was read and has not changed.',
		inputSchema: writeFileSchema,
		async prompt() {
			return 'Write files only after read-before-write validation passes.';
		},
		validateInput(input, context) {
			const path = resolve(input.path);
			const prior = context.getState().readFileState.get(path);
			if (!prior) return { ok: false, message: 'File must be read before writing.' };
			if (prior.isPartialView) return { ok: false, message: 'File must be fully read before writing.' };
			return { ok: true };
		},
		checkPermissions(input, context) {
			const decision = checkFilePath(input.path, context);
			return decision.behavior === 'allow'
				? { behavior: 'ask', message: `Approve writing ${resolve(input.path)}` }
				: decision;
		},
		async call(input, context) {
			const path = resolve(input.path);
			const prior = context.getState().readFileState.get(path);
			const current = await readFile(path, 'utf8');
			if (!prior || hash(current) !== prior.hash) {
				throw new Error('File changed since last read.');
			}
			await writeFile(path, input.content, 'utf8');
			return { data: { path }, content: `Wrote ${path}` };
		},
		isReadOnly() {
			return false;
		},
		isDestructive() {
			return true;
		},
	};
}
