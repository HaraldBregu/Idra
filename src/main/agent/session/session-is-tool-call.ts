import type { ToolCall } from '../types';
import { isRecord } from './session-is-record';
import { isToolResult } from './session-is-tool-result';

export function isToolCall(value: unknown): value is ToolCall {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		isRecord(value.args) &&
		(value.result === undefined || isToolResult(value.result))
	);
}
