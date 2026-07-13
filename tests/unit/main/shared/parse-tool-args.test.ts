import { parseToolArgs } from '../../../../src/main/shared/parse_tool_args';

describe('parseToolArgs', () => {
	it('returns an empty object for blank input', () => {
		expect(parseToolArgs('')).toEqual({});
		expect(parseToolArgs('   ')).toEqual({});
	});
	it('parses a JSON object', () => {
		expect(parseToolArgs('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
	});
	it('wraps a non-object JSON value under __parsed', () => {
		expect(parseToolArgs('[1,2]')).toEqual({ __parsed: [1, 2] });
		expect(parseToolArgs('42')).toEqual({ __parsed: 42 });
	});
	it('wraps invalid JSON under __unparsed', () => {
		expect(parseToolArgs('{not json')).toEqual({ __unparsed: '{not json' });
	});
});
