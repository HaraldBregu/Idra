import { validateJsonSchema } from './schema';
import type { JsonSchema, ToolResult } from './types';

export interface ToolOutputProvenance {
	toolId: string;
	source?: string;
	url?: string;
	fetchedAt?: string;
	citations: string[];
}

export interface ValidatedToolOutput<TOutput = unknown> {
	status: 'valid' | 'invalid' | 'partial' | 'suspicious' | 'contradictory' | 'stale';
	data?: TOutput;
	normalizedData?: unknown;
	warnings: string[];
	provenance: ToolOutputProvenance;
}

const PROMPT_INJECTION_PATTERN =
	/(ignore|disregard|override)\s+(all\s+)?(previous|system|developer|user)\s+instructions|system prompt|developer message|reveal (secrets|credentials)|send (tokens|passwords|api keys)/i;

export class ToolOutputValidator {
	validate<TOutput>(result: ToolResult<TOutput>, outputSchema: JsonSchema, maxAgeMs?: number): ValidatedToolOutput<TOutput> {
		const warnings = [...result.warnings];
		const provenance = extractProvenance(result);
		if (!result.success) {
			return { status: 'invalid', warnings, provenance };
		}
		const validation = validateJsonSchema(result.data, outputSchema);
		if (!validation.valid) {
			return {
				status: 'invalid',
				data: result.data,
				normalizedData: result.data,
				warnings: [...warnings, ...validation.errors],
				provenance,
			};
		}
		const empty = isEmptyResult(result.data);
		const suspicious = containsPromptInjection(result.data);
		const contradictory = containsContradiction(result.data, result.metadata);
		const stale = isStale(provenance.fetchedAt, maxAgeMs);
		const normalizedData = suspicious ? removePromptInjectionInstructions(result.data) : result.data;
		if (empty) warnings.push('tool returned empty or partial data');
		if (suspicious) warnings.push('tool output contained prompt-injection-like text and was treated as untrusted data');
		if (contradictory) warnings.push('tool output contains contradictory or conflicting data');
		if (stale) warnings.push('tool output may be stale');
		const status = suspicious ? 'suspicious' : contradictory ? 'contradictory' : stale ? 'stale' : empty ? 'partial' : 'valid';
		return { status, data: result.data, normalizedData, warnings, provenance };
	}
}

function isEmptyResult(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === 'string') return value.trim().length === 0;
	if (Array.isArray(value)) return value.length === 0;
	if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
	return false;
}

function containsPromptInjection(value: unknown): boolean {
	if (typeof value === 'string') return PROMPT_INJECTION_PATTERN.test(value);
	if (Array.isArray(value)) return value.some(containsPromptInjection);
	if (typeof value === 'object' && value !== null) return Object.values(value as Record<string, unknown>).some(containsPromptInjection);
	return false;
}

function containsContradiction(value: unknown, metadata: Record<string, unknown>): boolean {
	if (hasNonEmptyArray(metadata.contradictions) || hasNonEmptyArray(metadata.conflicts)) return true;
	if (typeof value !== 'object' || value === null) return false;
	if (hasNonEmptyArray((value as Record<string, unknown>).contradictions)) return true;
	if (hasNonEmptyArray((value as Record<string, unknown>).conflicts)) return true;
	if (!Array.isArray(value)) return Object.values(value as Record<string, unknown>).some((item) => containsContradiction(item, {}));
	const seen = new Map<string, string>();
	for (const item of value) {
		if (typeof item !== 'object' || item === null) continue;
		const record = item as Record<string, unknown>;
		const key = firstString(record, ['id', 'key', 'name', 'source']);
		if (!key || !Object.prototype.hasOwnProperty.call(record, 'value')) continue;
		const serialized = JSON.stringify(record.value);
		const previous = seen.get(key);
		if (previous !== undefined && previous !== serialized) return true;
		seen.set(key, serialized);
	}
	return false;
}

function hasNonEmptyArray(value: unknown): boolean {
	return Array.isArray(value) && value.length > 0;
}

function firstString(record: Record<string, unknown>, fields: string[]): string | undefined {
	for (const field of fields) {
		if (typeof record[field] === 'string' && record[field].trim()) return record[field];
	}
	return undefined;
}

function removePromptInjectionInstructions(value: unknown): unknown {
	if (typeof value === 'string') return value.replace(PROMPT_INJECTION_PATTERN, '[removed untrusted instruction]');
	if (Array.isArray(value)) return value.map(removePromptInjectionInstructions);
	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, removePromptInjectionInstructions(item)])
		);
	}
	return value;
}

function isStale(fetchedAt: string | undefined, maxAgeMs: number | undefined): boolean {
	if (!fetchedAt || !maxAgeMs) return false;
	const timestamp = Date.parse(fetchedAt);
	if (!Number.isFinite(timestamp)) return false;
	return Date.now() - timestamp > maxAgeMs;
}

function extractProvenance<TOutput>(result: ToolResult<TOutput>): ToolOutputProvenance {
	const metadata = result.metadata;
	const citations = Array.isArray(metadata.citations)
		? metadata.citations.filter((item): item is string => typeof item === 'string')
		: [];
	return {
		toolId: result.toolId,
		source: typeof metadata.source === 'string' ? metadata.source : undefined,
		url: typeof metadata.url === 'string' ? metadata.url : undefined,
		fetchedAt: typeof metadata.fetchedAt === 'string' ? metadata.fetchedAt : undefined,
		citations,
	};
}
