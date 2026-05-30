import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
	AgentHarnessPersistence,
	AgentHarnessSession,
	AgentHarnessSnapshot,
} from '../types';
import { redactHarnessSecrets } from '../config';

export class FileAgentHarnessPersistence implements AgentHarnessPersistence {
	constructor(private readonly baseDir: string) {}

	async loadSession(id: string): Promise<AgentHarnessSession | null> {
		return this.readJson<AgentHarnessSession>(this.sessionPath(id));
	}

	async saveSession(session: AgentHarnessSession): Promise<void> {
		await this.writeJson(this.sessionPath(session.id), redactHarnessSecrets(session));
	}

	async listSessions(): Promise<AgentHarnessSession[]> {
		const dir = path.join(this.baseDir, 'sessions');
		const entries = await fs.readdir(dir).catch(() => []);
		const sessions = await Promise.all(
			entries
				.filter((entry) => entry.endsWith('.json'))
				.map((entry) => this.readJson<AgentHarnessSession>(path.join(dir, entry)))
		);
		return sessions.flatMap((session) => session ? [session] : []);
	}

	async deleteSession(id: string): Promise<void> {
		await fs.rm(this.sessionPath(id), { force: true });
	}

	async saveSnapshot(snapshot: AgentHarnessSnapshot): Promise<void> {
		await this.writeJson(this.snapshotPath(snapshot.id), redactHarnessSecrets(snapshot));
	}

	async loadSnapshot(id: string): Promise<AgentHarnessSnapshot | null> {
		return this.readJson<AgentHarnessSnapshot>(this.snapshotPath(id));
	}

	private sessionPath(id: string): string {
		return path.join(this.baseDir, 'sessions', `${safeFileName(id)}.json`);
	}

	private snapshotPath(id: string): string {
		return path.join(this.baseDir, 'snapshots', `${safeFileName(id)}.json`);
	}

	private async readJson<T>(file: string): Promise<T | null> {
		try {
			return JSON.parse(await fs.readFile(file, 'utf8')) as T;
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
			throw error;
		}
	}

	private async writeJson(file: string, value: unknown): Promise<void> {
		await fs.mkdir(path.dirname(file), { recursive: true });
		await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
	}
}

function safeFileName(value: string): string {
	return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
