import fs from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { AgentHistory } from '../agent_v2';
import type { HistoryEntry } from '../agent_v2';

export class History extends AgentHistory {
	private readonly historyPath: string;

	constructor(location: string, name = 'history') {
		super();
		this.historyPath = path.join(path.resolve(location), name);
		if (!existsSync(this.historyPath)) {
			mkdirSync(this.historyPath, { recursive: true });
		}
	}

	async create(sessionId: string): Promise<void> {
		await fs.mkdir(this.historyPath, { recursive: true });
		await fs.appendFile(this.filePath(sessionId), '');
	}

	async append(sessionId: string, entry: HistoryEntry): Promise<void> {
		await this.create(sessionId);
		await fs.appendFile(
			this.filePath(sessionId),
			`${JSON.stringify({ ...entry, timestamp: entry.timestamp ?? new Date().toISOString() })}\n`
		);
	}

	private filePath(sessionId: string): string {
		return path.join(this.historyPath, `${safeName(sessionId)}.jsonl`);
	}
}

function safeName(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_') || 'session';
}
