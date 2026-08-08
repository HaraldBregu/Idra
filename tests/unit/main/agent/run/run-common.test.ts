import { formatToolOutput } from '../../../../../src/main/agent/run/run_common';
import { limitToolOutput } from '../../../../../src/main/agent/run/run_limit_output';

describe('formatToolOutput', () => {
	it('returns strings unchanged', () => {
		expect(formatToolOutput('hello')).toBe('hello');
	});
	it('returns an empty string for undefined', () => {
		expect(formatToolOutput(undefined)).toBe('');
	});
	it('JSON-stringifies objects and arrays', () => {
		expect(formatToolOutput({ a: 1 })).toBe('{"a":1}');
		expect(formatToolOutput([1, 2])).toBe('[1,2]');
	});
	it('stringifies primitives', () => {
		expect(formatToolOutput(42)).toBe('42');
		expect(formatToolOutput(null)).toBe('null');
	});
	it('falls back to String() for non-serializable values', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(formatToolOutput(circular)).toBe('[object Object]');
	});
});

it('bounds undefined and circular tool output without crashing', () => {
	const circular: { self?: unknown } = {};
	circular.self = circular;

	expect(limitToolOutput(undefined, 10)).toBeUndefined();
	expect(limitToolOutput(circular, 100)).toBe(circular);
});
