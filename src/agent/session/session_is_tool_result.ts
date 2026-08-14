import type { ToolCall } from '../types';
import { isMessageContent } from './session_is_message_content';
import { isRecord } from './session_is_record';

export function isToolResult(value: unknown): value is NonNullable<ToolCall['result']> {
	return isRecord(value) && isMessageContent(value.content);
}
