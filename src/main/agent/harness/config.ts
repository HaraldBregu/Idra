import type { AgentHarnessConfig, AgentHarnessSecretRedactor } from './types';
import { AgentHarnessError } from './errors';

export class DefaultAgentHarnessSecretRedactor implements AgentHarnessSecretRedactor {
	redact(value: unknown): unknown {
		if (Array.isArray(value)) return value.map((entry) => this.redact(entry));
		if (!value || typeof value !== 'object') return value;
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [/secret|token|key|password/i.test(key) ? key : key, /secret|token|key|password/i.test(key) ? '[redacted]' : this.redact(entry)]));
	}
}

export function validateAgentHarnessConfig(config: AgentHarnessConfig): void {
	if (!config.modelId?.trim()) throw new AgentHarnessError({ code: 'config_invalid', message: 'modelId is required.' });
	if (!config.model) throw new AgentHarnessError({ code: 'config_invalid', message: 'model is required.' });
}
