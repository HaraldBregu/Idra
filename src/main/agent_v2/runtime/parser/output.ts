import type { RuntimeToolCall } from './types';

export function parseOutput(text: string): { text: string; toolCalls: RuntimeToolCall[] } {
	const match = text.match(/\{[\s\S]*"toolCalls"[\s\S]*\}/);
	if (!match) return { text, toolCalls: [] };

	try {
		const parsed = JSON.parse(match[0]) as { toolCalls?: unknown };
		if (!Array.isArray(parsed.toolCalls)) return { text, toolCalls: [] };
		const toolCalls = parsed.toolCalls.flatMap((call): RuntimeToolCall[] => {
			if (!call || typeof call !== 'object') return [];
			const record = call as Record<string, unknown>;
			if (typeof record.name !== 'string') return [];
			const args =
				record.args && typeof record.args === 'object' && !Array.isArray(record.args)
					? record.args as Record<string, unknown>
					: {};
			return [{ name: record.name, args }];
		});
		return { text: text.replace(match[0], '').trim(), toolCalls };
	} catch {
		return { text, toolCalls: [] };
	}
}
