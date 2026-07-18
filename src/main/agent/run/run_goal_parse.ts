export type GoalCommand =
	| { action: 'status' }
	| { action: 'start' | 'edit'; text: string }
	| { action: 'pause' | 'resume' | 'complete' | 'block'; note?: string }
	| { action: 'clear' };

export function parseGoalCommand(message: string): GoalCommand | undefined {
	const match = message.trim().match(/^\/goal(?:\s+([\s\S]+))?$/i);
	if (!match) return undefined;
	const rest = match[1]?.trim() ?? '';
	if (!rest || /^status$/i.test(rest)) return { action: 'status' };
	const [, keyword = '', remainder = ''] = rest.match(/^(\S+)\s*([\s\S]*)$/) ?? [];
	const text = remainder.trim();
	switch (keyword.toLowerCase()) {
		case 'start':
		case 'set':
		case 'create':
			return { action: 'start', text };
		case 'edit':
			return { action: 'edit', text };
		case 'pause':
			return { action: 'pause', ...(text ? { note: text } : {}) };
		case 'resume':
			return { action: 'resume', ...(text ? { note: text } : {}) };
		case 'complete':
		case 'done':
			return { action: 'complete', ...(text ? { note: text } : {}) };
		case 'block':
		case 'blocked':
			return { action: 'block', ...(text ? { note: text } : {}) };
		case 'clear':
			return { action: 'clear' };
		default:
			// Unknown action text is treated as the objective of a new goal.
			return { action: 'start', text: rest };
	}
}
