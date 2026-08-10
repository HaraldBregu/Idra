import { retryAfterMs } from '../../../../../src/main/agent/run/run_retry_after';

it('parses Retry-After seconds and HTTP dates with a bounded delay', () => {
	expect(retryAfterMs({ headers: { 'retry-after': '1.5' } }, 0)).toBe(1_500);
	expect(
		retryAfterMs({ response: { headers: { 'Retry-After': 'Thu, 01 Jan 1970 00:00:02 GMT' } } }, 0)
	).toBe(2_000);
	expect(retryAfterMs({ headers: { 'retry-after': '300' } }, 0)).toBe(30_000);
	expect(retryAfterMs(new Error('no headers'), 0)).toBeUndefined();
});
