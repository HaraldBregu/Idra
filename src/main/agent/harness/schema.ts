import type { JSONSchema } from '../../provider/types';

export interface SchemaValidationResult {
	valid: boolean;
	errors: string[];
}

export function validateJsonSchemaValue(schema: JSONSchema | undefined, value: unknown): SchemaValidationResult {
	if (!schema) return { valid: true, errors: [] };
	const errors: string[] = [];
	validateAtPath(schema, value, '$', errors);
	return { valid: errors.length === 0, errors };
}

function validateAtPath(schema: JSONSchema, value: unknown, path: string, errors: string[]): void {
	if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
		errors.push(`${path} must be one of ${schema.enum.map(String).join(', ')}`);
		return;
	}

	if (schema.type && !matchesType(schema.type, value)) {
		errors.push(`${path} must be ${schema.type}`);
		return;
	}

	if (schema.type === 'object' || schema.properties) {
		if (!isRecord(value)) {
			errors.push(`${path} must be object`);
			return;
		}
		for (const required of schema.required ?? []) {
			if (!(required in value)) errors.push(`${path}.${required} is required`);
		}
		const properties = schema.properties ?? {};
		for (const [key, childSchema] of Object.entries(properties)) {
			if (key in value && isJsonSchema(childSchema)) {
				validateAtPath(childSchema, value[key], `${path}.${key}`, errors);
			}
		}
		if (schema.additionalProperties === false) {
			const allowed = new Set(Object.keys(properties));
			for (const key of Object.keys(value)) {
				if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
			}
		}
	}

	if (schema.type === 'array' || schema.items) {
		if (!Array.isArray(value)) {
			errors.push(`${path} must be array`);
			return;
		}
		if (isJsonSchema(schema.items)) {
			value.forEach((entry, index) => validateAtPath(schema.items as JSONSchema, entry, `${path}[${index}]`, errors));
		}
	}
}

function matchesType(type: string, value: unknown): boolean {
	if (type === 'array') return Array.isArray(value);
	if (type === 'object') return isRecord(value);
	if (type === 'integer') return Number.isInteger(value);
	if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
	if (type === 'string') return typeof value === 'string';
	if (type === 'boolean') return typeof value === 'boolean';
	if (type === 'null') return value === null;
	return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isJsonSchema(value: unknown): value is JSONSchema {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
