import type { MessageContentBlock } from '../types';
import { isRecord } from './session_is_record';

export function isContentBlock(value: unknown): value is MessageContentBlock {
	return isRecord(value) && typeof value.type === 'string';
}
