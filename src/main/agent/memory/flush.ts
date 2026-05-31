import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { acquireWriteLock } from '../session/lock';
import type { SessionFile } from '../session/store';
import { MEMORY_DIRNAME } from './constants';
import type { MemoryFlushPlan } from './contracts';
import { sanitizeTranscriptForMemory } from './transcript';

export function resolveMemoryFlushPlan(workspaceDir: string, clock: () => Date = () => new Date()): MemoryFlushPlan {
	const date = toLocalDate(clock());
	const relativePath = path.join(MEMORY_DIRNAME, `${date}.md`);
	const targetPath = path.resolve(workspaceDir, relativePath);
	return {
		targetPath,
		relativePath,
		prompt: `Append durable facts, decisions, TODOs, and user preferences from the current session to ${relativePath}.`,
	};
}

export async function appendOnlyMemoryFlush(plan: MemoryFlushPlan, content: string): Promise<void> {
	const target = path.resolve(plan.targetPath);
	const fileName = path.basename(target);
	const workspace = path.dirname(path.dirname(target));
	const expectedRelativePath = path.join(MEMORY_DIRNAME, fileName);
	if (!/^\d{4}-\d{2}-\d{2}\.md$/.test(fileName) || plan.relativePath !== expectedRelativePath) {
		throw new Error('Memory flush target must be memory/YYYY-MM-DD.md inside the workspace.');
	}
	if (path.resolve(workspace, plan.relativePath) !== target) {
		throw new Error('Memory flush target must match the planned daily memory file.');
	}
	const memoryDir = path.dirname(target);
	await fs.mkdir(memoryDir, { recursive: true, mode: 0o700 });
	const lock = await acquireWriteLock(target);
	try {
		const body = content.endsWith('\n') ? content : `${content}\n`;
		await fs.appendFile(target, body, { encoding: 'utf8', mode: 0o600 });
		if (process.platform !== 'win32') await fs.chmod(target, 0o600).catch(() => undefined);
	} finally {
		await lock.release();
	}
}

export async function flushSessionMemoryBeforeCompaction(
	session: SessionFile,
	workspaceDir: string,
	options: {
		clock?: () => Date;
		minTranscriptBytes?: number;
	} = {}
): Promise<{ status: 'skipped' | 'flushed'; targetPath?: string; reason?: string }> {
	const rendered = sanitizeTranscriptForMemory(session.transcript)
		.map((entry) => `${entry.role.toUpperCase()}: ${entry.text}`)
		.join('\n');
	const bytes = Buffer.byteLength(rendered, 'utf8');
	if (bytes < (options.minTranscriptBytes ?? 0)) return { status: 'skipped', reason: 'below_threshold' };

	const contextHash = createHash('sha1').update(rendered).digest('hex').slice(0, 12);
	if (session.memoryFlushContextHash === contextHash) return { status: 'skipped', reason: 'already_flushed' };

	const plan = resolveMemoryFlushPlan(workspaceDir, options.clock);
	const now = (options.clock ?? (() => new Date()))().toISOString();
	const content = [
		`## Session ${session.id} pre-compaction ${now}`,
		'',
		rendered || 'No transcript content available.',
		'',
	].join('\n');
	await appendOnlyMemoryFlush(plan, content);
	session.memoryFlushAt = now;
	session.memoryFlushCompactionCount = session.compactionMarkers.length;
	session.memoryFlushContextHash = contextHash;
	return { status: 'flushed', targetPath: plan.targetPath };
}

function toLocalDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
