import type { ToolCall } from '../types';
import { isMessageContent } from './is_message_content';
import { isRecord } from './common';

export function isToolResult(value: unknown): value is NonNullable<ToolCall['result']> {
	return isRecord(value) && isMessageContent(value.content);
}
