import type { AgentContext } from './context_types';

export function adoptSubagent(parent: AgentContext, child: AgentContext): void {
	(parent.subagents ??= []).push(child);
}
