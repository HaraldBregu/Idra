import type { JSONSchema } from '../../../provider/types';

export function validateJsonSchemaValue(schema: JSONSchema, value: unknown): { valid: boolean; errors: string[] } {
	if (schema.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) return { valid: false, errors: ['value must be an object'] };
	const record = value as Record<string, unknown>;
	const errors = (schema.required ?? []).filter((key) => record[key] === undefined).map((key) => `${key} is required`);
	return { valid: errors.length === 0, errors };
}
