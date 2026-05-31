import { textResult } from '../core/types';

export function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}
