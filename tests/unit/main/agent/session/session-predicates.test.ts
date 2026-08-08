import { isUuid } from '../../../../../src/main/agent/session/session_is_uuid';
import { requireUuidSessionId } from '../../../../../src/main/agent/session/session_require_uuid';
import { safeName } from '../../../../../src/main/agent/session/session_safe_name';
import { isRecord } from '../../../../../src/main/agent/session/session_is_record';
import { isContentBlock } from '../../../../../src/main/agent/session/session_is_content_block';
import { isMessageContent } from '../../../../../src/main/agent/session/session_is_message_content';
import { isToolResult } from '../../../../../src/main/agent/session/session_is_tool_result';
import { isToolCall } from '../../../../../src/main/agent/session/session_is_tool_call';
import { isMessage } from '../../../../../src/main/agent/session/session_is_message';
import { sessionFolderName } from '../../../../../src/main/agent/session/session_session_folder_name';

describe('isUuid', () => {
	it('accepts a valid v4 uuid', () => {
		expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
	});
	it('is case-insensitive', () => {
		expect(isUuid('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
	});
	it('rejects non-uuid strings', () => {
		expect(isUuid('home')).toBe(false);
		expect(isUuid('')).toBe(false);
		expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false);
	});
});

describe('requireUuidSessionId', () => {
	it('trims and returns a UUID', () => {
		expect(requireUuidSessionId(' 123e4567-e89b-12d3-a456-426614174000 ')).toBe(
			'123e4567-e89b-12d3-a456-426614174000'
		);
	});

	it.each([undefined, '', 'home', '.', '..'])('rejects the public session id %j', (sessionId) => {
		expect(() => requireUuidSessionId(sessionId)).toThrow('Invalid assistant session id.');
	});
});

describe('safeName', () => {
	it('keeps allowed characters', () => {
		expect(safeName('a-b_c.1')).toBe('a-b_c.1');
	});
	it('replaces disallowed characters with underscores', () => {
		expect(safeName('a/b c:d')).toBe('a_b_c_d');
	});
	it('replaces each disallowed char (does not collapse them)', () => {
		expect(safeName('///')).toBe('___');
	});
	it('falls back to "session" only when the result is empty', () => {
		expect(safeName('')).toBe('session');
	});
});

describe('isRecord', () => {
	it('accepts plain objects', () => {
		expect(isRecord({})).toBe(true);
		expect(isRecord({ a: 1 })).toBe(true);
	});
	it('rejects arrays, null and primitives', () => {
		expect(isRecord([])).toBe(false);
		expect(isRecord(null)).toBe(false);
		expect(isRecord('x')).toBe(false);
		expect(isRecord(3)).toBe(false);
	});
});

describe('isContentBlock', () => {
	it('requires a string type field', () => {
		expect(isContentBlock({ type: 'text' })).toBe(true);
		expect(isContentBlock({ type: 1 })).toBe(false);
		expect(isContentBlock({})).toBe(false);
	});
});

describe('isMessageContent', () => {
	it('accepts a plain string', () => {
		expect(isMessageContent('hello')).toBe(true);
	});
	it('accepts an array of content blocks', () => {
		expect(isMessageContent([{ type: 'text' }, { type: 'image' }])).toBe(true);
	});
	it('rejects arrays containing invalid blocks', () => {
		expect(isMessageContent([{ type: 'text' }, {}])).toBe(false);
	});
	it('rejects other types', () => {
		expect(isMessageContent(42)).toBe(false);
	});
});

describe('isToolResult', () => {
	it('requires valid message content', () => {
		expect(isToolResult({ content: 'ok' })).toBe(true);
		expect(isToolResult({ content: [{ type: 'text' }] })).toBe(true);
		expect(isToolResult({ content: 5 })).toBe(false);
		expect(isToolResult('nope')).toBe(false);
	});
});

describe('isToolCall', () => {
	const base = { id: '1', name: 'read', args: {} };
	it('accepts a minimal tool call', () => {
		expect(isToolCall(base)).toBe(true);
	});
	it('accepts a tool call with a valid result', () => {
		expect(isToolCall({ ...base, result: { content: 'done' } })).toBe(true);
	});
	it('rejects missing/invalid fields', () => {
		expect(isToolCall({ ...base, id: 1 })).toBe(false);
		expect(isToolCall({ ...base, args: null })).toBe(false);
		expect(isToolCall({ ...base, result: { content: 9 } })).toBe(false);
	});
});

describe('isMessage', () => {
	it('accepts valid roles with string content', () => {
		expect(isMessage({ role: 'user', content: 'hi' })).toBe(true);
		expect(isMessage({ role: 'assistant', content: [{ type: 'text' }] })).toBe(true);
	});
	it('accepts an assistant message with tool calls', () => {
		expect(
			isMessage({ role: 'assistant', content: 'x', toolCalls: [{ id: '1', name: 'n', args: {} }] })
		).toBe(true);
	});
	it('rejects invalid roles', () => {
		expect(isMessage({ role: 'tool', content: 'x' })).toBe(false);
	});
	it('rejects invalid tool calls', () => {
		expect(isMessage({ role: 'assistant', content: 'x', toolCalls: [{}] })).toBe(false);
		expect(isMessage({ role: 'assistant', content: 'x', toolCalls: 'nope' })).toBe(false);
	});
	it('rejects non-records', () => {
		expect(isMessage(null)).toBe(false);
	});
});

describe('sessionFolderName', () => {
	it('delegates to safeName', () => {
		expect(sessionFolderName('a/b')).toBe('a_b');
	});
});
