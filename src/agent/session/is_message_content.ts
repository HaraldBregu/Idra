import type { MessageContent } from '../types';
import { isContentBlock } from './is_content_block';

export function isMessageContent(value: unknown): value is MessageContent {
	return typeof value === 'string' || (Array.isArray(value) && value.every(isContentBlock));
}
