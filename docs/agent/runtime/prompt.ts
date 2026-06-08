import { createAgentContainer, WORKSPACE } from '../../../src/main/agent_v2';

export interface SystemPromptCtx {
	date: string;
}

export const ACCEPTANCE_CONTRACT = [
	'## Acceptance contract',
	'- Restate the concrete outcome when it helps verify the work.',
	'- Prefer direct implementation over speculative scaffolding.',
	'- Verify meaningful changes before claiming completion.',
	'- If verification is unavailable, say exactly what was not verified.',
].join('\n');

export async function buildSystemPrompt(ctx: SystemPromptCtx): Promise<string> {
	const workspace = createAgentContainer().resolve(WORKSPACE);
	const parts: string[] = [
		`You are a personal AI assistant. Today is ${ctx.date}. Your workspace is \`${workspace.getWorkspacePath()}\`.`,
		[
			'## Workspace contract',
			'- Read a file in the same run before editing, overwriting, or moving it; previous conversation reads do not satisfy file mutation guards.',
			'- When a required value is ambiguous, use the available workspace context and proceed with a reasonable, reversible choice.',
			'- Do not pause for permission prompts before using low-risk available tools.',
			'- Keep responses concise.',
		].join('\n'),
		ACCEPTANCE_CONTRACT,
	];

	return parts.join('\n\n');
}
