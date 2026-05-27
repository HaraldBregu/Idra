import type { AgentHarnessConfig, AgentHarnessSecretRedactor } from './types';
import { AgentHarnessError } from './errors';

const SECRET_KEY_PATTERN = /(api[_-]?key|authorization|credential|password|private[_-]?key|secret|token|oauth|cookie)/i;
const SECRET_VALUE_PATTERNS: Array<[RegExp, string]> = [
	[/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/gi, '[redacted private key]'],
	[/((?:authorization)\s*:\s*bearer\s+)[^\s,;]+/gi, '$1[redacted]'],
	[/((?:api[_-]?key|credential|password|secret|token)\s*[:=]\s*)[^\s,;]+/gi, '$1[redacted]'],
];

export class DefaultAgentHarnessSecretRedactor implements AgentHarnessSecretRedactor {
	redact(value: unknown): unknown {
		return redactHarnessSecrets(value);
	}
}

export function validateAgentHarnessConfig(config: AgentHarnessConfig): void {
	if (!config.modelId.trim()) {
		throw new AgentHarnessError({ code: 'config_invalid', message: 'Agent harness modelId is required.' });
	}
	if (!config.model) {
		throw new AgentHarnessError({ code: 'config_invalid', message: 'Agent harness model adapter is required.' });
	}
	validatePositiveInteger(config.runtime?.maxIterations, 'runtime.maxIterations');
	validatePositiveInteger(config.runtime?.maxTokens, 'runtime.maxTokens');
	validatePositiveInteger(config.runtime?.maxInputTokens, 'runtime.maxInputTokens');
	validatePositiveInteger(config.runtime?.maxOutputTokens, 'runtime.maxOutputTokens');
	validatePositiveInteger(config.runtime?.timeoutMs, 'runtime.timeoutMs');
	validatePositiveInteger(config.runtime?.toolTimeoutMs, 'runtime.toolTimeoutMs');
	if (config.runtime?.maxCostUsd !== undefined && config.runtime.maxCostUsd <= 0) {
		throw new AgentHarnessError({ code: 'config_invalid', message: 'runtime.maxCostUsd must be greater than zero.' });
	}
	const names = new Set<string>();
	for (const tool of config.tools ?? []) {
		if (!tool.name.trim()) {
			throw new AgentHarnessError({ code: 'config_invalid', message: 'Every tool must have a name.' });
		}
		if (names.has(tool.name)) {
			throw new AgentHarnessError({ code: 'config_invalid', message: `Duplicate tool name: ${tool.name}` });
		}
		names.add(tool.name);
	}
}

export function redactHarnessSecrets(value: unknown, depth = 0): unknown {
	if (depth > 8) return '[redacted-depth-limit]';
	if (typeof value === 'string') return redactString(value);
	if (value === null || typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.map((entry) => redactHarnessSecrets(entry, depth + 1));
	const output: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value)) {
		output[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redactHarnessSecrets(child, depth + 1);
	}
	return output;
}

function redactString(value: string): string {
	return SECRET_VALUE_PATTERNS.reduce((next, [pattern, replacement]) => next.replace(pattern, replacement), value);
}

function validatePositiveInteger(value: number | undefined, name: string): void {
	if (value === undefined) return;
	if (!Number.isInteger(value) || value <= 0) {
		throw new AgentHarnessError({ code: 'config_invalid', message: `${name} must be a positive integer.` });
	}
}
