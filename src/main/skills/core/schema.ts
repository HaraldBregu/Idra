import type { JsonSchema } from './types';

export interface SchemaValidationResult {
	valid: boolean;
	errors: string[];
}

function schemaObject(value: unknown): Record<string, unknown> {
	return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function typeOf(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	return typeof value;
}

function expectedTypes(schema: Record<string, unknown>): string[] {
	const type = schema.type;
	if (Array.isArray(type)) return type.filter((item): item is string => typeof item === 'string');
	if (typeof type === 'string') return [type];
	return [];
}

function validateNode(schema: Record<string, unknown>, value: unknown, path: string, errors: string[]): void {
	const allowedTypes = expectedTypes(schema);
	if (allowedTypes.length > 0 && !allowedTypes.includes(typeOf(value))) {
		errors.push(`${path} must be ${allowedTypes.join(' or ')}, got ${typeOf(value)}`);
		return;
	}

	const enumValues = schema.enum;
	if (Array.isArray(enumValues) && !enumValues.some((item) => Object.is(item, value))) {
		errors.push(`${path} must be one of ${enumValues.map(String).join(', ')}`);
		return;
	}

	if (typeOf(value) === 'object') {
		const objectValue = value as Record<string, unknown>;
		const required = Array.isArray(schema.required)
			? schema.required.filter((item): item is string => typeof item === 'string')
			: [];
		for (const key of required) {
			if (!(key in objectValue)) errors.push(`${path}.${key} is required`);
		}

		const properties = schemaObject(schema.properties);
		for (const [key, childSchema] of Object.entries(properties)) {
			if (key in objectValue) {
				validateNode(schemaObject(childSchema), objectValue[key], `${path}.${key}`, errors);
			}
		}

		if (schema.additionalProperties === false) {
			const allowedKeys = new Set(Object.keys(properties));
			for (const key of Object.keys(objectValue)) {
				if (!allowedKeys.has(key)) errors.push(`${path}.${key} is not allowed`);
			}
		}
	}

	if (Array.isArray(value) && schema.items) {
		const itemSchema = schemaObject(schema.items);
		value.forEach((item, index) => validateNode(itemSchema, item, `${path}[${index}]`, errors));
	}
}

export function validateJsonSchema(schema: JsonSchema, value: unknown): SchemaValidationResult {
	const errors: string[] = [];
	validateNode(schemaObject(schema), value, '$', errors);
	return { valid: errors.length === 0, errors };
}
