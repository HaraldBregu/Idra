import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { JsonSchemaType } from '@modelcontextprotocol/sdk/validation';
import type { JSONSchema } from '../../types';
import { MCP_MAX_SCHEMA_BYTES } from './limits';

export function mcpInputParser(schema: JSONSchema): (input: unknown) => Record<string, unknown> {
	if (!schema || typeof schema !== 'object' || Array.isArray(schema) || schema.type !== 'object') {
		throw new Error('MCP tool input schema must be an object schema.');
	}
	const serialized = JSON.stringify(schema);
	if (Buffer.byteLength(serialized, 'utf8') > MCP_MAX_SCHEMA_BYTES) {
		throw new Error(`MCP tool input schema exceeds ${MCP_MAX_SCHEMA_BYTES} bytes.`);
	}
	const validate = new AjvJsonSchemaValidator().getValidator<Record<string, unknown>>(
		schema as JsonSchemaType
	);
	return (input: unknown) => {
		const result = validate(input);
		if (!result.valid) throw new Error(result.errorMessage);
		if (!result.data || typeof result.data !== 'object' || Array.isArray(result.data)) {
			throw new Error('MCP tool input must be an object.');
		}
		return result.data;
	};
}
