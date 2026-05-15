import type { TaskSchema } from './task.types';
import { TaskValidationError } from './task.errors';

export function validateAgainstSchema(schema: TaskSchema, value: unknown, path = 'value'): void {
	if (schema.enum && !schema.enum.some((entry) => Object.is(entry, value))) {
		throw new TaskValidationError(`${path} must be one of the allowed values.`);
	}

	if (schema.type === 'null') {
		if (value !== null) throw new TaskValidationError(`${path} must be null.`);
		return;
	}

	if (schema.type === 'array') {
		if (!Array.isArray(value)) throw new TaskValidationError(`${path} must be an array.`);
		if (schema.items) {
			value.forEach((item, index) => validateAgainstSchema(schema.items!, item, `${path}[${index}]`));
		}
		return;
	}

	if (schema.type === 'object') {
		if (typeof value !== 'object' || value === null || Array.isArray(value)) {
			throw new TaskValidationError(`${path} must be an object.`);
		}
		const record = value as Record<string, unknown>;
		for (const required of schema.required ?? []) {
			if (!(required in record)) throw new TaskValidationError(`${path}.${required} is required.`);
		}
		const properties = schema.properties ?? {};
		if (schema.additionalProperties === false) {
			const extra = Object.keys(record).find((key) => !(key in properties));
			if (extra) throw new TaskValidationError(`${path}.${extra} is not allowed.`);
		}
		for (const [key, childSchema] of Object.entries(properties)) {
			if (key in record) validateAgainstSchema(childSchema, record[key], `${path}.${key}`);
		}
		return;
	}

	if (typeof value !== schema.type) {
		throw new TaskValidationError(`${path} must be ${schema.type}.`);
	}
}
