import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from 'electron';
import { History, HistoryEntry } from './core/history';

export class SessionHistory extends History {
	private readonly historyPath: string;

	constructor() {
		super();
		this.historyPath = path.join(resolveAppDataPath(), 'agent-history');
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

function resolveAppDataPath(): string {
	try {
		return app.getPath('appData');
	} catch {
		return path.resolve(process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd());
	}
}
