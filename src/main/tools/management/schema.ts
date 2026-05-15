import type { JsonSchema } from './types';

export interface SchemaValidationResult {
	valid: boolean;
	errors: string[];
}

export interface SanitizedInputResult {
	value: Record<string, unknown>;
	unknownFields: string[];
}

type SchemaType = 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null';

export function validateJsonSchema(value: unknown, schema: JsonSchema, path = '$'): SchemaValidationResult {
	const errors: string[] = [];
	validateValue(value, schema, path, errors);
	return { valid: errors.length === 0, errors };
}

export function sanitizeObjectBySchema(
	value: unknown,
	schema: JsonSchema,
	allowUnknownFields = false
): SanitizedInputResult {
	if (!isRecord(value)) return { value: {}, unknownFields: [] };
	const properties = schemaProperties(schema);
	const output: Record<string, unknown> = {};
	const unknownFields: string[] = [];
	for (const [key, fieldValue] of Object.entries(value)) {
		if (Object.prototype.hasOwnProperty.call(properties, key) || allowUnknownFields || schema.additionalProperties) {
			output[key] = fieldValue;
		} else {
			unknownFields.push(key);
		}
	}
	return { value: output, unknownFields };
}

export function requiredSchemaFields(schema: JsonSchema): string[] {
	return Array.isArray(schema.required) ? schema.required.filter((field): field is string => typeof field === 'string') : [];
}

export function schemaProperties(schema: JsonSchema): Record<string, JsonSchema> {
	if (!isRecord(schema.properties)) return {};
	const out: Record<string, JsonSchema> = {};
	for (const [key, value] of Object.entries(schema.properties)) {
		if (isRecord(value)) out[key] = value as JsonSchema;
	}
	return out;
}

function validateValue(value: unknown, schema: JsonSchema, path: string, errors: string[]): void {
	const expected = normalizeTypes(schema.type);
	if (expected.length > 0 && !expected.some((type) => matchesType(value, type))) {
		errors.push(`${path}: expected ${expected.join(' or ')}`);
		return;
	}

	if (Array.isArray(schema.enum) && !schema.enum.some((item) => Object.is(item, value))) {
		errors.push(`${path}: expected one of ${schema.enum.map(String).join(', ')}`);
		return;
	}

	if (isRecord(value) && (schema.type === 'object' || schema.properties || schema.required)) {
		const props = schemaProperties(schema);
		for (const field of requiredSchemaFields(schema)) {
			if (!Object.prototype.hasOwnProperty.call(value, field) || value[field] === undefined || value[field] === null) {
				errors.push(`${path}.${field}: required`);
			}
		}
		if (schema.additionalProperties === false) {
			for (const key of Object.keys(value)) {
				if (!Object.prototype.hasOwnProperty.call(props, key)) errors.push(`${path}.${key}: unknown field`);
			}
		}
		for (const [key, childSchema] of Object.entries(props)) {
			if (Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined) {
				validateValue(value[key], childSchema, `${path}.${key}`, errors);
			}
		}
	}

	if (Array.isArray(value) && isRecord(schema.items)) {
		value.forEach((item, index) => validateValue(item, schema.items as JsonSchema, `${path}[${index}]`, errors));
	}
}

function normalizeTypes(type: unknown): SchemaType[] {
	if (typeof type === 'string' && isSchemaType(type)) return [type];
	if (Array.isArray(type)) return type.filter((item): item is SchemaType => typeof item === 'string' && isSchemaType(item));
	return [];
}

function isSchemaType(value: string): value is SchemaType {
	return ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(value);
}

function matchesType(value: unknown, type: SchemaType): boolean {
	switch (type) {
		case 'object':
			return isRecord(value);
		case 'array':
			return Array.isArray(value);
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number' && Number.isFinite(value);
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'null':
			return value === null;
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

