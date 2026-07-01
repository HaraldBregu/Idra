import type { ToolCall } from '../types';
import { isMessageContent } from './session-is-message-content';
import { isRecord } from './session-is-record';

export function isToolResult(value: unknown): value is NonNullable<ToolCall['result']> {
	return isRecord(value) && isMessageContent(value.content);
}
