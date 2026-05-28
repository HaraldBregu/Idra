import os from 'node:os';
import path from 'node:path';
import { buildSystemPrompt } from '../../../../src/main/agent/system-prompt';
import type { AgentTool } from '../../../../src/main/tools/types';

describe('agent/system-prompt', () => {
	it('builds deterministic prompts with sorted tool guidance and memory blocks', async () => {
		const tools: AgentTool[] = [
			{ name: 'exec', description: 'Run commands', schema: {}, execute: jest.fn() },
			{ name: 'write', description: 'Write files', schema: {}, execute: jest.fn() },
			{ name: 'read', description: 'Read files', schema: {}, execute: jest.fn() },
		];
		const memory = {
			readAll: jest.fn(async () => ({ MEMORY: 'remember this' })),
		};

		const prompt = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools,
			memory: memory as never,
		});

		expect(prompt).toContain('Today is 2026-05-14');
		expect(prompt.indexOf('**read**')).toBeLessThan(prompt.indexOf('**write**'));
		expect(prompt).toContain('Use `python3` for Python scripts');
		expect(prompt).toContain('<MEMORY>\nremember this\n</MEMORY>');
		expect(prompt).toBe(await buildSystemPrompt({ workspace: '/repo', date: '2026-05-14', model: 'gpt-test', tools, memory: memory as never }));
	});

	it('injects agent startup files and bootstrap guidance', async () => {
		const prompt = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools: [],
			bootstrapMode: 'full',
			startupFiles: [
				{
					name: 'SOUL.md',
					path: '/repo/SOUL.md',
					content: 'be concise',
					missing: false,
				},
				{
					name: 'BOOTSTRAP.md',
					path: '/repo/BOOTSTRAP.md',
					content: 'ask who you are',
					missing: false,
				},
			],
		});

		expect(prompt).toContain('BOOTSTRAP.md is pending');
		expect(prompt).toContain('## Project Context');
		expect(prompt).toContain('<startup_file name="SOUL.md" path="/repo/SOUL.md">');
		expect(prompt).toContain('persona/tone guidance only');
	});

	it('formats skill guidance as an escaped compact catalog', async () => {
		const prompt = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools: [],
			skills: [
				{
					id: 'xml-skill',
					version: '1.0.0',
					name: 'xml & support',
					description: 'Use <policy> references for support replies.',
					path: path.join(os.homedir(), 'skills', 'xml-skill', 'SKILL.md'),
					category: 'support',
					tags: [],
					requiredTools: [],
					requiredConnectors: [],
					permissionsRequired: [],
					safetyLevel: 'low',
					score: 0.91,
				},
			],
		});

		expect(prompt).toContain('<available_skills>');
		expect(prompt).toContain('read its SKILL.md at the exact <location> with `read`');
		expect(prompt).not.toContain('Use `execute_skill` to load a skill');
		expect(prompt).toContain('<id>xml-skill@1.0.0</id>');
		expect(prompt).toContain('<name>xml &amp; support</name>');
		expect(prompt).toContain('<description>Use &lt;policy&gt; references for support replies.</description>');
		expect(prompt).toContain('<location>~/skills/xml-skill/SKILL.md</location>');
	});

});
