import type { ToolCall } from '../types';
import { isRecord } from './is_record';
import { isToolResult } from './is_tool_result';

export function isToolCall(value: unknown): value is ToolCall {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		typeof value.name === 'string' &&
		isRecord(value.args) &&
		(value.result === undefined || isToolResult(value.result))
	);
}
