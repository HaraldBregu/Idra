import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AgentHarnessSkill, AgentHarnessSkillLoader } from './types';

export class FileAgentHarnessSkillLoader implements AgentHarnessSkillLoader {
	constructor(private readonly rootDir: string) {}
	async list(): Promise<Array<Pick<AgentHarnessSkill, 'name' | 'description'>>> {
		const entries = await fs.readdir(this.rootDir, { withFileTypes: true }).catch(() => []);
		return entries.filter((entry) => entry.isDirectory()).map((entry) => ({ name: entry.name }));
	}
	async select(input: { task: string; candidates: Array<Pick<AgentHarnessSkill, 'name' | 'description'>> }): Promise<string[]> {
		const task = input.task.toLowerCase();
		return input.candidates.filter((candidate) => task.includes(candidate.name.toLowerCase())).map((candidate) => candidate.name);
	}
	async load(name: string): Promise<AgentHarnessSkill> {
		const file = path.join(this.rootDir, name, 'SKILL.md');
		const instructions = await fs.readFile(file, 'utf8');
		return { name, instructions };
	}
}
