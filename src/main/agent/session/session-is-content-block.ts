import type { MessageContentBlock } from '../core/types';
import { isRecord } from './session-is-record';

export function isContentBlock(value: unknown): value is MessageContentBlock {
	return isRecord(value) && typeof value.type === 'string';
}
