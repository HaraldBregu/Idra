import type { Tool, ToolResult } from './types';

export interface MemoryPolicyDecision {
	shouldStore: boolean;
	reason: string;
	value?: unknown;
}

export class MemoryPolicy {
	evaluateToolOutput<TOutput>(tool: Tool<unknown, TOutput>, result: ToolResult<TOutput>): MemoryPolicyDecision {
		if (!result.success) return { shouldStore: false, reason: 'failed tool output is not stored' };
		if (tool.metadata.privacyLevel === 'private' || tool.metadata.privacyLevel === 'sensitive') {
			return { shouldStore: false, reason: 'private or sensitive tool output is not stored by default' };
		}
		if (tool.category !== 'memory' && tool.metadata.persistOutput !== true) {
			return { shouldStore: false, reason: 'tool outputs are not automatically long-term memory' };
		}
		if (containsSensitiveKey(result.data)) return { shouldStore: false, reason: 'output appears to contain sensitive fields' };
		return { shouldStore: true, reason: 'output is explicitly marked safe to store', value: result.data };
	}
}

function containsSensitiveKey(value: unknown): boolean {
	if (Array.isArray(value)) return value.some(containsSensitiveKey);
	if (typeof value !== 'object' || value === null) return false;
	return Object.entries(value as Record<string, unknown>).some(
		([key, item]) => /(token|secret|password|api[_-]?key|credential|payment|card)/i.test(key) || containsSensitiveKey(item)
	);
}

