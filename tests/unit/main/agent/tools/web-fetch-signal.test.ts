const lookup = jest.fn();

jest.mock('node:dns/promises', () => ({ lookup }));

import { fetchWebPageTool } from '../../../../../src/main/agent/tools/web/fetch_web_page';

const originalFetch = global.fetch;

afterAll(() => {
	global.fetch = originalFetch;
});

it('combines the run signal with its request timeout', async () => {
	lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
	let requestStarted: (() => void) | undefined;
	const started = new Promise<void>((resolve) => {
		requestStarted = resolve;
	});
	global.fetch = jest.fn((_url, init) => {
		requestStarted?.();
		return new Promise((_resolve, reject) => {
			init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
		});
	}) as typeof fetch;
	const controller = new AbortController();
	const result = fetchWebPageTool.run({ url: 'https://example.com' }, controller.signal);
	await started;
	const reason = new Error('cancel fetch');
	controller.abort(reason);

	await expect(result).rejects.toBe(reason);
	const init = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
	expect(init.signal?.aborted).toBe(true);
});
