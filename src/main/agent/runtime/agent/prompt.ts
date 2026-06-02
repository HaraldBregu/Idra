import type { AgentContext } from './context';

export function buildRuntimePrompt(basePrompt: string, context: AgentContext): string {
	return [
		basePrompt,
		...context.getState().activeInstructions,
	]
		.filter(Boolean)
		.join('\n\n');
}
