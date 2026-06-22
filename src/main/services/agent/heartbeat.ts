import fs from 'node:fs/promises';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Service } from 'typedi';
import { Heartbeat } from './core/heartbeat';
import { resolveAgentUsageLocation } from './shared/location';

const HEARTBEAT_FILE = 'HEARTBEAT.md';

@Service()
export class HeartbeatService extends Heartbeat {
	private readonly heartbeatPath = path.resolve(resolveAgentUsageLocation(), 'heartbeat');

	constructor() {
		super();
		if (!existsSync(this.heartbeatPath)) {
			mkdirSync(this.heartbeatPath, { recursive: true });
		}
		this.ensureFile();
	}

	getPath(): string {
		return this.heartbeatPath;
	}

	async getText(): Promise<string> {
		try {
			return await fs.readFile(path.join(this.heartbeatPath, HEARTBEAT_FILE), 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
			throw error;
		}
	}

	private ensureFile(): void {
		const filePath = path.join(this.heartbeatPath, HEARTBEAT_FILE);
		if (existsSync(filePath)) return;
		copyFileSync(this.resolveTemplatePath(HEARTBEAT_FILE), filePath);
	}

	private resolveTemplatePath(filePath: string): string {
		const templatePath = path.join('resources', 'templates', filePath);
		const developmentPath = path.resolve(process.cwd(), templatePath);
		if (existsSync(developmentPath)) return developmentPath;
		return path.join(process.resourcesPath, templatePath);
	}
}
