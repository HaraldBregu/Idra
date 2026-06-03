import { textResult } from '../core/tool';

export function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}
