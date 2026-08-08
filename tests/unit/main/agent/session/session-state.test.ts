import { isExhausted } from '../../../../../src/main/agent/session/session_is_exhausted';
import { toResult } from '../../../../../src/main/agent/session/session_to_result';
import { stringifyRunEntry } from '../../../../../src/main/agent/session/session_stringify_run_entry';
import { createSessionState } from '../../../../../src/main/agent/session/session_module_state';

describe('isExhausted', () => {
	it('is true when numTurns reaches maxTurns', () => {
		expect(isExhausted({ ...createSessionState(), numTurns: 20, maxTurns: 20 })).toBe(true);
		expect(isExhausted({ ...createSessionState(), numTurns: 21, maxTurns: 20 })).toBe(true);
	});
	it('is false while turns remain', () => {
		expect(isExhausted({ ...createSessionState(), numTurns: 5, maxTurns: 20 })).toBe(false);
	});
});

describe('toResult', () => {
	const base = {
		...createSessionState(),
		id: 'sid',
		model: 'm1',
		finalText: 'answer',
		numTurns: 3,
		toolCalls: [{ id: '1', name: 'n', args: {} }],
		usage: { inputTokens: 10, outputTokens: 20 },
		stopReason: 'end_turn',
	};

	it('maps a successful run', () => {
		const r = toResult(base, 'success');
		expect(r).toMatchObject({
			text: 'answer',
			model: 'm1',
			numTurns: 3,
			subtype: 'success',
			sessionId: 'sid',
			stopReason: 'end_turn',
			usage: { inputTokens: 10, outputTokens: 20 },
		});
		expect(r.toolCalls).toHaveLength(1);
	});

	it('defaults stopReason to end_turn on success when unset', () => {
		expect(toResult({ ...base, stopReason: undefined }, 'success').stopReason).toBe('end_turn');
	});

	it('blanks text and preserves stopReason on error', () => {
		const r = toResult({ ...base, stopReason: 'max' }, 'error_max_turns');
		expect(r.text).toBe('');
		expect(r.subtype).toBe('error_max_turns');
		expect(r.stopReason).toBe('max');
	});
});

	describe('stringifyRunEntry', () => {
	it('wraps an event with a timestamp', () => {
		const parsed = JSON.parse(stringifyRunEntry({ type: 'x' })!);
		expect(parsed.event).toEqual({ type: 'x' });
		expect(typeof parsed.timestamp).toBe('string');
	});
	it('replaces invalid events without serializing their payload', () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		const parsed = JSON.parse(stringifyRunEntry(circular)!);
		expect(parsed.event).toEqual({ type: 'invalid_event' });
	});
	it('omits raw deltas and provider payloads', () => {
		expect(stringifyRunEntry({ type: 'model_call_delta', delta: 'private answer' })).toBeUndefined();
		expect(
			stringifyRunEntry({ type: 'model_provider_item', item: { secret: 'provider payload' } })
		).toBeUndefined();
	});
	it('keeps semantic tool timing without input or output payloads', () => {
		const serialized = stringifyRunEntry({
			type: 'tool_call_end',
			toolCallId: 'call-1',
			toolName: 'exec',
			input: { token: 'secret-input' },
			output: 'secret-output',
			isError: false,
			durationMs: 12,
		});
		expect(serialized).not.toContain('secret-input');
		expect(serialized).not.toContain('secret-output');
		expect(JSON.parse(serialized!).event).toEqual({
			type: 'tool_call_end',
			toolCallId: 'call-1',
			toolName: 'exec',
			isError: false,
			durationMs: 12,
		});
	});
});
