import type { SkillDefinition, SkillLogger, SkillResult } from '../core/types';

export interface SkillAuditRecord {
	skillId: string;
	version: string;
	userId: string;
	sessionId: string;
	inputSummary: string;
	outputSummary: string;
	usedTools: string[];
	usedConnectors: string[];
	permissionsUsed: string[];
	executionDurationMs: number;
	retries: number;
	failures: string[];
	warnings: string[];
	safetyInterventions: string[];
	createdAt: string;
}

const SECRET_KEY_PATTERN = /api[_-]?key|authorization|credential|oauth|password|secret|token/i;

function redact(value: unknown, depth = 0): unknown {
	if (depth > 4) return '[truncated]';
	if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
	if (!value || typeof value !== 'object') return value;
	const out: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
		out[key] = SECRET_KEY_PATTERN.test(key) ? '[redacted]' : redact(child, depth + 1);
	}
	return out;
}

function summarize(value: unknown): string {
	const text = JSON.stringify(redact(value));
	return text.length > 1000 ? `${text.slice(0, 1000)}...` : text;
}

export class SkillAuditLog {
	private readonly records: SkillAuditRecord[] = [];

	constructor(private readonly logger?: SkillLogger) {}

	record(skill: SkillDefinition, context: { userId: string; sessionId: string }, input: unknown, result: SkillResult): void {
		const record: SkillAuditRecord = {
			skillId: skill.id,
			version: skill.version,
			userId: context.userId,
			sessionId: context.sessionId,
			inputSummary: summarize(input),
			outputSummary: summarize(result.success ? result.data : result.error),
			usedTools: [...new Set(result.usedTools)],
			usedConnectors: [...new Set(result.usedConnectors)],
			permissionsUsed: [...skill.permissionsRequired],
			executionDurationMs: result.durationMs,
			retries: result.retryCount,
			failures: result.error ? [result.error.message] : [],
			warnings: result.warnings,
			safetyInterventions: result.error?.code === 'safety_denied' ? [result.error.message] : [],
			createdAt: new Date().toISOString(),
		};
		this.records.push(record);
		this.logger?.info('SkillAuditLog', `Recorded ${skill.id}@${skill.version}`, {
			skillId: record.skillId,
			durationMs: record.executionDurationMs,
			success: result.success,
		});
	}

	list(): SkillAuditRecord[] {
		return this.records.map((record) => ({ ...record }));
	}
}
