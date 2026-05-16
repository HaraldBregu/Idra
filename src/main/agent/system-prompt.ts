import type { AgentTool } from '../tools/types';
import type { MemoryManager } from '../memory';
import type { SkillPromptChoice } from '../skills/types';

export interface SystemPromptCtx {
	workspace: string;
	date: string;
	model: string;
	tools: AgentTool[];
	memory?: MemoryManager;
	skills?: SkillPromptChoice[];
}

const TOOL_GUIDANCE: Record<string, string> = {
	read: 'Read a file before editing or overwriting it.',
	write: 'Create or overwrite files. Read existing files first.',
	edit: 'Surgical string-replacement edit. Provide enough context to make `old` unique.',
	apply_patch: 'Apply a unified diff to files that have already been read.',
	find: 'Glob-search the workspace for files.',
	exec: 'Run a shell command. Output capped at 200 lines / 16KB.',
	open_folder: 'Open a workspace folder in the OS file manager. Prefer this over `exec` for opening folders.',
	process: 'Inspect or stop long-running background commands started by exec.',
	web_fetch: 'Fetch an HTTP(S) URL when current external documentation is needed.',
	update_plan: 'Maintain a concise task plan for multi-step work.',
	ask_human:
		'Call this when a required value is ambiguous or unspecified (file path, destination, name). Pass `suggestions` when you have candidates.',
};

export async function buildSystemPrompt(ctx: SystemPromptCtx): Promise<string> {
	const parts: string[] = [
		`You are Friday, a personal AI agent. Today is ${ctx.date}. Your workspace is \`${ctx.workspace}\`.`,
		[
			'## Workspace contract',
			'- Read a file before editing or overwriting it.',
			'- When a required value is ambiguous (file path, name, destination, choice), call `ask_human` instead of guessing.',
			'- Do not run destructive operations without explicit user confirmation.',
			'- Keep responses concise.',
		].join('\n'),
	];

	if (ctx.tools.length > 0) {
		const guidance = [
			'## Tool guidance',
			'Only these tools are available for this turn. Use a tool only when it is necessary for the request.',
		];
		for (const tool of [...ctx.tools].sort((a, b) => a.name.localeCompare(b.name))) {
			const line = TOOL_GUIDANCE[tool.name] ?? tool.description;
			guidance.push(`- **${tool.name}** — ${line}`);
		}
		parts.push(guidance.join('\n'));
	} else {
		parts.push(
			[
				'## Tool guidance',
				'No tools are available for this turn. Answer directly from the conversation and general reasoning.',
			].join('\n')
		);
	}

	if (ctx.skills?.length) {
		const skills = [
			'## Skill guidance',
			'Use `execute_skill` for reusable high-level workflows. Only these compact, pre-ranked candidates are relevant for this request:',
			...ctx.skills.map((skill) => {
				const toolText = skill.requiredTools.length ? ` tools=${skill.requiredTools.join(',')}` : '';
				const connectorText = skill.requiredConnectors.length
					? ` connectors=${skill.requiredConnectors.join(',')}`
					: '';
				return `- ${skill.id}@${skill.version} (${skill.category}, score=${skill.score.toFixed(2)}, safety=${skill.safetyLevel}) — ${skill.description}${toolText}${connectorText}`;
			}),
		];
		parts.push(skills.join('\n'));
	}

	if (ctx.memory) {
		const all = await ctx.memory.readAll();
		for (const [tag, content] of Object.entries(all)) {
			parts.push(`<${tag}>\n${content}\n</${tag}>`);
		}
	}

	return parts.join('\n\n');
}
