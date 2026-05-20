import { requiredSchemaFields, sanitizeObjectBySchema, schemaProperties, validateJsonSchema } from './schema';
import type { RelevantMemory, SessionContext, Tool } from './types';

export type ToolArgumentBuildResult<TInput> =
	| { type: 'valid'; input: TInput; warnings: string[] }
	| { type: 'clarificationRequired'; question: string; missingFields: string[]; errors: string[] };

export interface ToolArgumentBuildInput {
	intendedCall: unknown;
	sessionContext: SessionContext;
	memory?: RelevantMemory;
}

export class ToolArgumentBuilder {
	build<TInput>(tool: Tool<TInput>, input: ToolArgumentBuildInput): ToolArgumentBuildResult<TInput> {
		const raw = extractRawArguments(input.intendedCall, tool);
		const allowUnknown = tool.metadata.allowUnknownInputFields === true || tool.inputSchema.additionalProperties !== false;
		const sanitized = sanitizeObjectBySchema(raw, tool.inputSchema, allowUnknown);
		if (sanitized.unknownFields.length > 0) {
			return {
				type: 'clarificationRequired',
				question: `Remove unsupported fields for ${tool.name}: ${sanitized.unknownFields.join(', ')}.`,
				missingFields: [],
				errors: sanitized.unknownFields.map((field) => `${field}: unknown field`),
			};
		}
		const normalized = normalizeArguments(sanitized.value, tool, input);
		const missingFields = requiredSchemaFields(tool.inputSchema).filter((field) => normalized[field] === undefined || normalized[field] === null || normalized[field] === '');
		if (missingFields.length > 0) {
			return {
				type: 'clarificationRequired',
				question: `I need ${missingFields.join(', ')} before using ${tool.name}.`,
				missingFields,
				errors: missingFields.map((field) => `${field}: required`),
			};
		}
		const validation = validateJsonSchema(normalized, tool.inputSchema);
		if (!validation.valid) {
			return {
				type: 'clarificationRequired',
				question: `The ${tool.name} input is invalid: ${validation.errors.join('; ')}.`,
				missingFields: [],
				errors: validation.errors,
			};
		}
		return { type: 'valid', input: normalized as TInput, warnings: [] };
	}
}

function extractRawArguments(intendedCall: unknown): unknown {
	if (!isRecord(intendedCall)) return {};
	return intendedCall;
}

function extractRawArgumentsForWrapper(intendedCall: Record<string, unknown>, tool: Tool): unknown {
	const properties = schemaProperties(tool.inputSchema);
	const required = requiredSchemaFields(tool.inputSchema);
	const hasDirectSchemaField = Object.keys(intendedCall).some((key) => (
		key !== 'input' && Object.prototype.hasOwnProperty.call(properties, key)
	));
	const nestedInput = isRecord(intendedCall.input) ? intendedCall.input : undefined;
	const nestedHasRequiredField = nestedInput
		? required.some((field) => Object.prototype.hasOwnProperty.call(nestedInput, field))
		: false;
	if (hasDirectSchemaField || (Object.prototype.hasOwnProperty.call(properties, 'input') && nestedHasRequiredField)) {
		return intendedCall;
	}
	if (nestedInput) return nestedInput;
	if (isRecord(intendedCall.arguments)) return intendedCall.arguments;
	if (isRecord(intendedCall.args)) return intendedCall.args;
	return intendedCall;
}

function extractRawArguments(intendedCall: unknown, tool: Tool): unknown {
	if (!isRecord(intendedCall)) return {};
	return extractRawArgumentsForWrapper(intendedCall, tool);
}

function previousExtractRawArguments(intendedCall: unknown): unknown {
	if (!isRecord(intendedCall)) return {};
	if (isRecord(intendedCall.input)) return intendedCall.input;
	if (isRecord(intendedCall.arguments)) return intendedCall.arguments;
	if (isRecord(intendedCall.args)) return intendedCall.args;
	return intendedCall;
}

function normalizeArguments(value: Record<string, unknown>, tool: Tool, input: ToolArgumentBuildInput): Record<string, unknown> {
	const properties = schemaProperties(tool.inputSchema);
	const normalized: Record<string, unknown> = {};
	for (const [field, rawValue] of Object.entries(value)) {
		const schema = properties[field];
		normalized[field] = normalizeValue(field, rawValue, schema, input.sessionContext);
	}
	for (const field of requiredSchemaFields(tool.inputSchema)) {
		if (normalized[field] !== undefined) continue;
		const memoryValue = input.memory?.safeDefaults?.[field];
		const schema = properties[field];
		if (schema && (schema as Record<string, unknown>)['x-useMemory'] === true && memoryValue !== undefined) {
			normalized[field] = normalizeValue(field, memoryValue, schema, input.sessionContext);
		}
	}
	return normalized;
}

function normalizeValue(field: string, value: unknown, schema: unknown, sessionContext: SessionContext): unknown {
	const schemaRecord = isRecord(schema) ? schema : {};
	const type = schemaRecord.type;
	if ((type === 'number' || type === 'integer') && typeof value === 'string' && value.trim()) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : value;
	}
	if (typeof value !== 'string') return value;
	const trimmed = value.trim();
	if (/email/i.test(field)) return trimmed.toLowerCase();
	if (/currency/i.test(field)) return trimmed.toUpperCase();
	if (/(unit|units)$/i.test(field)) return trimmed.toLowerCase();
	if (/(^id$|id$|Id$)/.test(field)) return trimmed;
	if (/(date|time|startsAt|endsAt|from|to|at)$/i.test(field) || schemaRecord.format === 'date-time') {
		if (/^today$/i.test(trimmed)) return dateOnly(sessionContext);
		if (/^tomorrow$/i.test(trimmed)) return dateOnly(sessionContext, 1);
		const timestamp = Date.parse(trimmed);
		if (Number.isFinite(timestamp)) return new Date(timestamp).toISOString();
	}
	return trimmed;
}

function dateOnly(sessionContext: SessionContext, offsetDays = 0): string {
	const parts = datePartsInTimezone(resolveNow(sessionContext), sessionContext.userTimezone);
	const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + offsetDays));
	return date.toISOString().slice(0, 10);
}

function resolveNow(sessionContext: SessionContext): Date {
	if (sessionContext.metadata?.now instanceof Date) return sessionContext.metadata.now;
	if (typeof sessionContext.metadata?.now === 'string') {
		const parsed = new Date(sessionContext.metadata.now);
		if (Number.isFinite(parsed.getTime())) return parsed;
	}
	return new Date();
}

function datePartsInTimezone(now: Date, timeZone: string): { year: number; month: number; day: number } {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).formatToParts(now);
		const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
		return {
			year: Number(lookup.year),
			month: Number(lookup.month),
			day: Number(lookup.day),
		};
	} catch {
		return {
			year: now.getUTCFullYear(),
			month: now.getUTCMonth() + 1,
			day: now.getUTCDate(),
		};
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
