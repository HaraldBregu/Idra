import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentHarnessSession, AgentHarnessSkill, AgentHarnessSkillLoader } from './types';
import { AgentHarnessError } from './errors';

export interface FileSkillLoaderOptions {
	rootDir: string;
	filename?: string;
}

export class FileAgentHarnessSkillLoader implements AgentHarnessSkillLoader {
	private readonly filename: string;

	constructor(private readonly options: FileSkillLoaderOptions) {
		this.filename = options.filename ?? 'SKILL.md';
	}

	async list(): Promise<Array<Pick<AgentHarnessSkill, 'name' | 'description'>>> {
		const entries = await fs.readdir(this.options.rootDir, { withFileTypes: true }).catch(() => []);
		const skills: Array<Pick<AgentHarnessSkill, 'name' | 'description'>> = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const file = path.join(this.options.rootDir, entry.name, this.filename);
			const raw = await fs.readFile(file, 'utf8').catch(() => '');
			if (!raw) continue;
			skills.push({ name: entry.name, description: readFrontmatterString(raw, 'description') });
		}
		return skills;
	}

	async select(input: {
		task: string;
		session: AgentHarnessSession;
		context: Record<string, unknown>;
		candidates: Array<Pick<AgentHarnessSkill, 'name' | 'description'>>;
	}): Promise<string[]> {
		const task = input.task.toLowerCase();
		return input.candidates
			.filter((skill) => {
				const haystack = `${skill.name} ${skill.description ?? ''}`.toLowerCase();
				return haystack.split(/\W+/).some((word) => word.length > 3 && task.includes(word));
			})
			.map((skill) => skill.name);
	}

	async load(name: string): Promise<AgentHarnessSkill> {
		const safeName = path.basename(name);
		if (safeName !== name) {
			throw new AgentHarnessError({ code: 'config_invalid', message: `Invalid skill name: ${name}` });
		}
		const file = path.join(this.options.rootDir, safeName, this.filename);
		const raw = await fs.readFile(file, 'utf8').catch((error: unknown) => {
			throw new AgentHarnessError({
				code: 'storage_failed',
				message: `Skill not found: ${name}`,
				cause: error,
			});
		});
		return {
			name,
			description: readFrontmatterString(raw, 'description'),
			instructions: stripFrontmatter(raw).trim(),
		};
	}
}

function readFrontmatterString(raw: string, key: string): string | undefined {
	const match = raw.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return undefined;
	const line = match[1]
		.split('\n')
		.find((entry) => entry.trim().startsWith(`${key}:`));
	return line?.split(':').slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
}

function stripFrontmatter(raw: string): string {
	return raw.replace(/^---\n[\s\S]*?\n---\n?/, '');
}
