import type { AgentTool } from '../tools/types';
import type { MemoryManager } from '../memory';

export interface SystemPromptCtx {
	workspace: string;
	date: string;
	model: string;
	tools: AgentTool[];
	memory?: MemoryManager;
}

const TOOL_GUIDANCE: Record<string, string> = {
	read: 'Read a file before editing or overwriting it.',
	write: 'Create or overwrite files. Read existing files first.',
	edit: 'Surgical string-replacement edit. Provide enough context to make `old` unique.',
	apply_patch: 'Apply a unified diff to files that have already been read.',
	find: 'Glob-search the workspace for files.',
	exec: 'Run a shell command. Output capped at 200 lines / 16KB.',
	process: 'Inspect or stop long-running background commands started by exec.',
	web_fetch: 'Fetch an HTTP(S) URL when current external documentation is needed.',
	update_plan: 'Maintain a concise task plan for multi-step work.',
	ask_human:
		'Call this when a required value is ambiguous or unspecified (file path, destination, name). Pass `suggestions` when you have candidates.',
};

export async function buildSystemPrompt(ctx: SystemPromptCtx): Promise<string> {
	const parts: string[] = [
		`You are Friday, a personal AI assistant. Today is ${ctx.date}. Your workspace is \`${ctx.workspace}\`.`,
		[
			'## Workspace contract',
			'- Read a file before editing or overwriting it.',
			'- When a required value is ambiguous (file path, name, destination, choice), call `ask_human` instead of guessing.',
			'- Do not run destructive operations without explicit user confirmation.',
			'- Keep responses concise.',
		].join('\n'),
	];

	const guidance = ['## Tool guidance'];
	for (const tool of [...ctx.tools].sort((a, b) => a.name.localeCompare(b.name))) {
		const line = TOOL_GUIDANCE[tool.name] ?? tool.description;
		guidance.push(`- **${tool.name}** — ${line}`);
	}
	parts.push(guidance.join('\n'));

	if (ctx.memory) {
		const all = await ctx.memory.readAll();
		for (const [tag, content] of Object.entries(all)) {
			parts.push(`<${tag}>\n${content}\n</${tag}>`);
		}
	}

	return parts.join('\n\n');
}
