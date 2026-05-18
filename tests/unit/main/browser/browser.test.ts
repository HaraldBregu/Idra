import { promises as fs } from 'node:fs';
import { BrowserRuntime } from '../../../../src/main/browser/runtime';
import { BrowserService } from '../../../../src/main/browser/service';
import { makeTempDir } from '../test-helpers';

jest.mock('playwright-core', () => ({
	chromium: { launchPersistentContext: jest.fn() },
}));

type PageHandler = (page: FakePage) => void;

class FakePage {
	private listeners = new Map<string, () => void>();
	private currentUrl = 'about:blank';
	closed = false;
	titleText = '';
	goto = jest.fn(async (url: string) => {
		this.currentUrl = fakeRedirects.get(url) ?? url;
	});
	title = jest.fn(async () => this.titleText);
	ariaSnapshot = jest.fn(async () => '- document');
	screenshot = jest.fn(async () => Buffer.from('png'));
	bringToFront = jest.fn(async () => undefined);
	keyboard = { press: jest.fn(async () => undefined) };

	url(): string {
		return this.currentUrl;
	}

	once(event: string, handler: () => void): void {
		this.listeners.set(event, handler);
	}

	async close(): Promise<void> {
		this.closed = true;
		this.listeners.get('close')?.();
	}

	getByRole(): never {
		throw new Error('not needed by these tests');
	}

	locator(): never {
		throw new Error('not needed by these tests');
	}

	getByText(): never {
		throw new Error('not needed by these tests');
	}

	evaluate = jest.fn(async () => undefined);
}

class FakeContext {
	private listeners = new Map<string, () => void>();
	private pageHandlers: PageHandler[] = [];
	private pageList: FakePage[] = [];
	newPage = jest.fn(async () => {
		const page = new FakePage();
		this.pageList.push(page);
		for (const handler of this.pageHandlers) handler(page);
		return page;
	});

	pages(): FakePage[] {
		return this.pageList;
	}

	once(event: string, handler: () => void): void {
		this.listeners.set(event, handler);
	}

	on(event: string, handler: PageHandler): void {
		if (event === 'page') this.pageHandlers.push(handler);
	}

	async close(): Promise<void> {
		this.listeners.get('close')?.();
	}
}

const fakeRedirects = new Map<string, string>();

function launchPersistentContext(): jest.Mock {
	return (
		jest.requireMock('playwright-core') as {
			chromium: { launchPersistentContext: jest.Mock };
		}
	).chromium.launchPersistentContext;
}

describe('browser runtime', () => {
	let context: FakeContext;

	beforeEach(() => {
		context = new FakeContext();
		fakeRedirects.clear();
		launchPersistentContext().mockResolvedValue(context);
	});

	it('opens a new tab once even when the context emits a page event', async () => {
		const runtime = new BrowserRuntime('default', await makeTempDir(), true);

		const tab = await runtime.openTab('https://example.com', 'example');

		expect(tab).toMatchObject({ targetId: 't1', alias: 't1', label: 'example', url: 'https://example.com/' });
		await expect(runtime.tabs()).resolves.toEqual([
			expect.objectContaining({ targetId: 't1', alias: 't1', label: 'example', url: 'https://example.com/' }),
		]);
	});

	it('creates a blank tab for navigate when no active tab exists', async () => {
		const runtime = new BrowserRuntime('default', await makeTempDir(), true);

		const result = await runtime.navigate(undefined, 'https://example.org');

		expect(result).toEqual({ targetId: 't1', url: 'https://example.org/' });
		await expect(runtime.tabs()).resolves.toEqual([
			expect.objectContaining({ targetId: 't1', url: 'https://example.org/' }),
		]);
	});

	it('closes a new tab when redirects land on a blocked URL', async () => {
		const runtime = new BrowserRuntime('default', await makeTempDir(), true);
		fakeRedirects.set('https://example.com/', 'http://127.0.0.1/private');

		await expect(runtime.openTab('https://example.com')).rejects.toThrow(
			'navigation blocked after redirect: blocked: private/local IP range',
		);
		await expect(runtime.tabs()).resolves.toEqual([]);
	});
});

describe('browser service', () => {
	it('does not create or launch a managed runtime for status or tabs', async () => {
		const baseDir = await makeTempDir();
		const service = new BrowserService(baseDir, true);

		await expect(service.status('default')).resolves.toEqual({ running: false, profile: 'default', tabs: [] });
		await expect(service.tabs('default')).resolves.toEqual({ running: false, tabs: [] });
		await expect(fs.readdir(baseDir)).resolves.toEqual([]);
	});

	it('reports user profile as attach-only instead of silently launching a sandbox browser', async () => {
		const service = new BrowserService(await makeTempDir(), true);

		expect(service.profiles()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'default', driver: 'managed', running: false }),
				expect.objectContaining({ name: 'openclaw', driver: 'managed', running: false }),
				expect.objectContaining({ name: 'user', driver: 'existing-session', attachOnly: true, running: false }),
			]),
		);
		await expect(service.start('user')).rejects.toThrow(
			'Browser profile "user" is attach-only; no attach backend is configured.',
		);
	});
});
