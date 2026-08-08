import { z } from 'zod';
import type { JSONSchema, JsonToolConfig, Tool, ToolConfig } from '../types';

function toJsonSchema(schema: z.ZodType): JSONSchema {
	const jsonSchema = { ...z.toJSONSchema(schema) } as JSONSchema;
	delete jsonSchema.$schema;
	return jsonSchema;
}

export function tool<T extends z.ZodType>({
	name,
	description,
	defaultPermission,
	alwaysAsk,
	hardApproval,
	stopOnReject,
	risk = 'low',
	effect = 'read',
	allowedOrigins,
	timeoutMs = 30_000,
	maxOutputBytes = 200_000,
	confirmDetail,
	targets,
	inputSchema,
	execute,
}: ToolConfig<T>): Tool {
	return {
		name,
		description,
		defaultPermission,
		alwaysAsk,
		hardApproval,
		stopOnReject,
		risk,
		effect,
		allowedOrigins,
		timeoutMs,
		maxOutputBytes,
		confirmDetail,
		targets,
		schema: toJsonSchema(inputSchema),
		parseInput(input: unknown) {
			return inputSchema.parse(input) as Record<string, unknown>;
		},
		async run(input: Record<string, unknown>, signal?: AbortSignal) {
			return execute(input as z.infer<T>, signal);
		},
	};
}

export function jsonTool({
	name,
	description,
	defaultPermission,
	hardApproval,
	risk = 'high',
	effect = 'external',
	allowedOrigins,
	timeoutMs = 30_000,
	maxOutputBytes = 200_000,
	targets,
	parseInput,
	schema,
	execute,
}: JsonToolConfig): Tool {
	return {
		name,
		description,
		defaultPermission,
		hardApproval,
		risk,
		effect,
		allowedOrigins,
		timeoutMs,
		maxOutputBytes,
		targets,
		schema,
		parseInput(input: unknown) {
			if (parseInput) return parseInput(input);
			if (!input || typeof input !== 'object' || Array.isArray(input)) {
				throw new Error('Tool input must be an object.');
			}
			return input as Record<string, unknown>;
		},
		async run(input: Record<string, unknown>, signal?: AbortSignal) {
			return execute(input, signal);
		},
	};
}
