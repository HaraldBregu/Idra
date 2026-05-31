import { createHash } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import type { AgentContext, PermissionDecision, Tool } from './types';

const filePathSchema = z.object({
	path: z.string().min(1),
});

const writeFileSchema = filePathSchema.extend({
	content: z.string(),
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
			return checkFilePath(input.path, context).behavior === 'allow'
				? { behavior: 'ask', message: `Approve writing ${resolve(input.path)}` }
				: checkFilePath(input.path, context);
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

function checkFilePath(path: string, context: AgentContext): PermissionDecision {
	const resolved = resolve(path);
	const roots = [process.cwd(), ...context.permissionContext.additionalWorkingDirectories].map((root) => resolve(root));
	if (!roots.some((root) => resolved === root || resolved.startsWith(`${root}/`))) {
		return { behavior: 'deny', message: `Path is outside allowed working directories: ${resolved}` };
	}
	return { behavior: 'allow' };
}

function hash(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}
