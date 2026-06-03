import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentTool } from '../base/tool';
import { textResult } from '../base/tool';
import { resolveAbs, snapshot } from '../shared/common';

interface ApplyPatchArgs {
	diff: string;
}

type PatchOperation = 'create' | 'modify' | 'delete';

interface PatchFile {
	path: string;
	oldPath: string;
	newPath: string;
	operation: PatchOperation;
	hunks: Array<{ oldStart: number; lines: string[] }>;
}

export const applyPatchTool: AgentTool<ApplyPatchArgs> = {
	name: 'apply_patch',
	description:
		'Apply a unified diff to workspace files. Use after reading affected files. Fails on context conflicts.',
	schema: {
		type: 'object',
		properties: {
			diff: { type: 'string', description: 'Unified diff text.' },
		},
		required: ['diff'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		try {
			const patches = parseUnifiedDiff(String(args.diff ?? ''));
			if (patches.length === 0) return textResult('apply_patch: no file patches found', true);
			const plans: Array<
				| { operation: 'create' | 'modify'; path: string; abs: string; content: string }
				| { operation: 'delete'; path: string; abs: string }
			> = [];
			const seen = new Set<string>();
			for (const patch of patches) {
				const abs = resolveAbs(ctx.workspace, patch.path);
				if (seen.has(abs)) return textResult(`apply_patch: duplicate file patch: ${patch.path}`, true);
				seen.add(abs);

				if (patch.operation === 'create') {
					const existing = await fs.stat(abs).catch(() => null);
					if (existing) return textResult(`apply_patch: file already exists: ${patch.path}`, true);
					plans.push({
						operation: 'create',
						path: patch.path,
						abs,
						content: buildCreatedFile(patch),
					});
					continue;
				}

				const stat = await fs.stat(abs);
				if (!stat.isFile()) return textResult(`apply_patch: ${patch.path} is not a file`, true);
				const last = ctx.readState.get(abs);
				if (!last) return textResult(`apply_patch: must read ${patch.path} before patching.`, true);
				if (stat.mtimeMs !== last.mtimeMs || stat.size !== last.size) {
					return textResult(`apply_patch: ${patch.path} changed on disk since last read.`, true);
				}
				const original = await fs.readFile(abs, 'utf8');
				const next = applyFilePatch(original, patch);
				if (patch.operation === 'delete') {
					if (next.length > 0)
						return textResult(`apply_patch: delete patch did not remove all content: ${patch.path}`, true);
					plans.push({ operation: 'delete', path: patch.path, abs });
				} else {
					plans.push({ operation: 'modify', path: patch.path, abs, content: next });
				}
			}
			const changed: string[] = [];
			for (const plan of plans) {
				if (plan.operation === 'delete') {
					await fs.rm(plan.abs);
					ctx.readState.delete(plan.abs);
				} else {
					await fs.mkdir(path.dirname(plan.abs), { recursive: true });
					await fs.writeFile(plan.abs, plan.content, 'utf8');
					const after = await fs.stat(plan.abs);
					ctx.readState.set(plan.abs, snapshot(after));
				}
				changed.push(plan.path);
			}
			return textResult(`patched ${changed.join(', ')}`);
		} catch (err) {
			return textResult(`apply_patch: ${(err as Error).message}`, true);
		}
	},
};

function parseUnifiedDiff(diff: string): PatchFile[] {
	const lines = diff.split(/\r?\n/);
	const files: PatchFile[] = [];
	let current: PatchFile | null = null;
	let oldPath: string | null = null;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? '';
		if (line.startsWith('--- ')) {
			oldPath = parseDiffPath(line.slice(4));
			current = null;
			continue;
		}
		if (line.startsWith('+++ ')) {
			if (!oldPath) throw new Error(`missing old file header before: ${line}`);
			const newPath = parseDiffPath(line.slice(4));
			const operation = patchOperation(oldPath, newPath);
			current = {
				path: operation === 'delete' ? oldPath : newPath,
				oldPath,
				newPath,
				operation,
				hunks: [],
			};
			files.push(current);
			oldPath = null;
			continue;
		}
		if (!current || !line.startsWith('@@ ')) continue;
		const match = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
		if (!match) throw new Error(`invalid hunk header: ${line}`);
		const hunkLines: string[] = [];
		for (i++; i < lines.length; i++) {
			const hunkLine = lines[i] ?? '';
			if (
				hunkLine.startsWith('@@ ') ||
				hunkLine.startsWith('--- ') ||
				hunkLine.startsWith('+++ ')
			) {
				i--;
				break;
			}
			if (hunkLine === '\\ No newline at end of file') continue;
			if (![' ', '+', '-'].includes(hunkLine[0] ?? ''))
				throw new Error(`invalid patch line: ${hunkLine}`);
			hunkLines.push(hunkLine);
		}
		current.hunks.push({ oldStart: Number(match[1]), lines: hunkLines });
	}
	return files;
}

function parseDiffPath(value: string): string {
	const raw = value.trim().split(/\s+/)[0] ?? '';
	if (raw === '/dev/null') return raw;
	return raw.replace(/^[ab]\//, '');
}

function patchOperation(oldPath: string, newPath: string): PatchOperation {
	if (oldPath === '/dev/null' && newPath === '/dev/null') {
		throw new Error('invalid patch with both paths set to /dev/null');
	}
	if (oldPath === '/dev/null') return 'create';
	if (newPath === '/dev/null') return 'delete';
	if (oldPath !== newPath) throw new Error('renaming files via apply_patch is not supported');
	return 'modify';
}

function buildCreatedFile(patch: PatchFile): string {
	const out: string[] = [];
	for (const hunk of patch.hunks) {
		for (const line of hunk.lines) {
			if (line[0] !== '+') {
				throw new Error(`creation patch contains non-addition lines: ${patch.path}`);
			}
			out.push(line.slice(1));
		}
	}
	return out.length > 0 ? `${out.join('\n')}\n` : '';
}

function applyFilePatch(original: string, patch: PatchFile): string {
	const hasTrailingNewline = original.endsWith('\n');
	const originalLines = original.split('\n');
	if (hasTrailingNewline) originalLines.pop();
	const out: string[] = [];
	let cursor = 0;
	for (const hunk of patch.hunks) {
		const target = hunk.oldStart - 1;
		if (target < cursor) throw new Error(`overlapping hunk in ${patch.path}`);
		out.push(...originalLines.slice(cursor, target));
		cursor = target;
		for (const line of hunk.lines) {
			const marker = line[0];
			const text = line.slice(1);
			if (marker === ' ') {
				if (originalLines[cursor] !== text) {
					throw new Error(`context mismatch in ${patch.path} near line ${cursor + 1}`);
				}
				out.push(text);
				cursor++;
			} else if (marker === '-') {
				if (originalLines[cursor] !== text) {
					throw new Error(`removal mismatch in ${patch.path} near line ${cursor + 1}`);
				}
				cursor++;
			} else if (marker === '+') {
				out.push(text);
			}
		}
	}
	out.push(...originalLines.slice(cursor));
	return out.join('\n') + (hasTrailingNewline && out.length > 0 ? '\n' : '');
}
