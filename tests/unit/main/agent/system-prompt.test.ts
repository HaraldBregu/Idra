import { buildSystemPrompt } from '../../../../src/main/agent/system-prompt';
import type { AgentTool } from '../../../../src/main/tools/types';

describe('agent/system-prompt', () => {
	it('builds deterministic prompts with sorted tool guidance and memory blocks', async () => {
		const tools: AgentTool[] = [
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
		expect(prompt).toContain('<MEMORY>\nremember this\n</MEMORY>');
		expect(prompt).toBe(await buildSystemPrompt({ workspace: '/repo', date: '2026-05-14', model: 'gpt-test', tools, memory: memory as never }));
	});

	it('injects workspace files and bootstrap guidance', async () => {
		const prompt = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools: [],
			bootstrapMode: 'full',
			workspaceFiles: [
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
		expect(prompt).toContain('<workspace_file name="SOUL.md" path="/repo/SOUL.md">');
		expect(prompt).toContain('persona/tone guidance only');
	});

	it('injects memory recall guidance only when memory tools are available', async () => {
		const tools: AgentTool[] = [
			{ name: 'memory_search', description: 'Search memory', schema: {}, execute: jest.fn() },
			{ name: 'memory_get', description: 'Read memory', schema: {}, execute: jest.fn() },
		];

		const prompt = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools,
		});

		expect(prompt).toContain('## Memory Recall');
		expect(prompt).toContain('Use `memory_search` before answering questions about prior work');

		const withoutGet = await buildSystemPrompt({
			workspace: '/repo',
			date: '2026-05-14',
			model: 'gpt-test',
			tools: [tools[0]!],
		});
		expect(withoutGet).not.toContain('## Memory Recall');
	});
});
