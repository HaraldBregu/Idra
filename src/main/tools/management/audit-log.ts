export interface ToolAuditRecord {
	toolId: string;
	sanitizedInput: unknown;
	sanitizedOutputSummary: string;
	success: boolean;
	latencyMs: number;
	retryCount: number;
	userId?: string;
	sessionId: string;
	reasonForUse?: string;
	selectedAlternatives: string[];
	timestamp: string;
}

export interface ToolAuditLog {
	record(record: ToolAuditRecord): Promise<void>;
	list(): readonly ToolAuditRecord[];
}

export class InMemoryToolAuditLog implements ToolAuditLog {
	private readonly records: ToolAuditRecord[] = [];

	async record(record: ToolAuditRecord): Promise<void> {
		this.records.push(record);
	}

	list(): readonly ToolAuditRecord[] {
		return this.records;
	}
}

export class NoopToolAuditLog implements ToolAuditLog {
	async record(): Promise<void> {
		return undefined;
	}

	list(): readonly ToolAuditRecord[] {
		return [];
	}
}

const SECRET_FIELD = /(api[_-]?key|token|secret|password|credential|authorization|cookie|session|private[_-]?key|card|payment|ssn)/i;

export function redactSensitive(value: unknown): unknown {
	if (Array.isArray(value)) return value.map((item) => redactSensitive(item));
	if (!isPlainObject(value)) return value;
	const out: Record<string, unknown> = {};
	for (const [key, item] of Object.entries(value)) {
		out[key] = SECRET_FIELD.test(key) ? '[redacted]' : redactSensitive(item);
	}
	return out;
}

export function summarizeOutput(value: unknown, maxChars = 500): string {
	const redacted = redactSensitive(value);
	const raw = typeof redacted === 'string' ? redacted : JSON.stringify(redacted);
	if (!raw) return '';
	return raw.length > maxChars ? `${raw.slice(0, maxChars)}...` : raw;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

