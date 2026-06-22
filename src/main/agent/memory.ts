import fs from 'node:fs/promises';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { Service } from 'typedi';
import { Memory } from './core/memory';
import { resolveAgentUsageLocation } from './shared/location';

const MEMORY_FILE = 'MEMORY.md';

@Service()
export class MemoryService extends Memory {
	private readonly memoryPath = path.resolve(resolveAgentUsageLocation(), 'memory');

	constructor() {
		super();
		if (!existsSync(this.memoryPath)) {
			mkdirSync(this.memoryPath, { recursive: true });
		}
		this.ensureFile();
	}

	getPath(): string {
		return this.memoryPath;
	}

	async getText(): Promise<string> {
		try {
			return await fs.readFile(path.join(this.memoryPath, MEMORY_FILE), 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
			throw error;
		}
	}

	private ensureFile(): void {
		const filePath = path.join(this.memoryPath, MEMORY_FILE);
		if (existsSync(filePath)) return;
		copyFileSync(this.resolveTemplatePath(MEMORY_FILE), filePath);
	}

	private resolveTemplatePath(filePath: string): string {
		const templatePath = path.join('resources', 'templates', filePath);
		const developmentPath = path.resolve(process.cwd(), templatePath);
		if (existsSync(developmentPath)) return developmentPath;
		return path.join(process.resourcesPath, templatePath);
	}
}
