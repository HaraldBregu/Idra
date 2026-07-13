import { toError } from '../../../../../src/main/ipc/core/error';

describe('toError', () => {
	it('returns an Error instance unchanged', () => {
		const original = new Error('boom');
		expect(toError(original)).toBe(original);
	});
	it('uses the fallback for null/undefined', () => {
		expect(toError(undefined).message).toBe('IPC handler failed.');
		expect(toError(null, 'custom').message).toBe('custom');
	});
	it('wraps non-empty strings', () => {
		expect(toError('nope').message).toBe('nope');
	});
	it('falls back for empty strings', () => {
		expect(toError('', 'fb').message).toBe('fb');
	});
	it('serializes objects', () => {
		expect(toError({ code: 1 }).message).toBe('{"code":1}');
	});
	it('falls back for empty objects', () => {
		expect(toError({}, 'fb').message).toBe('fb');
	});
});
