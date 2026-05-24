import type { TaskRunRequest } from '../../shared/tasks';

function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`${name} must be an object.`);
	}
}

function requiredString(input: Record<string, unknown>, key: string, name: string): string {
	const value = input[key];
	if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
	const trimmed = value.trim();
	if (!trimmed) throw new Error(`${name} is required.`);
	return trimmed;
}

function optionalString(input: Record<string, unknown>, key: string, name: string): string | undefined {
	const value = input[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${name} must be a string.`);
	const trimmed = value.trim();
	return trimmed || undefined;
}

function optionalMetadata(value: unknown): Record<string, unknown> | undefined {
	if (value === undefined || value === null) return undefined;
	assertRecord(value, 'Task metadata');
	return value;
}

export function parseTaskRunRequest(value: unknown): TaskRunRequest {
	assertRecord(value, 'Task request');
	if (!Object.prototype.hasOwnProperty.call(value, 'input')) {
		throw new Error('Task input is required.');
	}

	const request: TaskRunRequest = {
		type: requiredString(value, 'type', 'Task type'),
		title: requiredString(value, 'title', 'Task title'),
		input: value.input,
	};
	const id = optionalString(value, 'id', 'Task id');
	const metadata = optionalMetadata(value.metadata);
	if (id) request.id = id;
	if (metadata) request.metadata = metadata;
	return request;
}
