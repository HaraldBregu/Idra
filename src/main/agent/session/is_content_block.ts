import type { MessageContentBlock } from '../types';
import { isRecord } from './common';

export function isContentBlock(value: unknown): value is MessageContentBlock {
	return isRecord(value) && typeof value.type === 'string';
}
