import type { BrowserContext, Page } from 'playwright-core';
import { chromium } from 'playwright-core';
import type { BrowserTab } from './types';
import { validateUrl } from './policy';

const LAUNCH_ARGS = [
	'--no-first-run',
	'--no-default-browser-check',
	'--disable-sync',
	'--disable-background-networking',
	'--disable-component-update',
	'--disable-features=Translate,MediaRouter',
	'--disable-session-crashed-bubble',
	'--hide-crash-restore-bubble',
	'--password-store=basic',
];

const NAV_TIMEOUT = 30_000;
const ACT_TIMEOUT = 10_000;
const SAFE_LABEL_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const REDACTED_URL = '[blocked by browser policy]';

export class BrowserRuntime {
	private context: BrowserContext | null = null;
	private _running = false;
	private pages = new Map<string, Page>();
	private pageIds = new WeakMap<Page, string>();
	private aliases = new Map<string, string>(); // alias (t1, t2…) -> targetId
	private labels = new Map<string, string>(); // user label -> targetId
	private counter = 0;
	private lastTargetId: string | null = null;

	constructor(
		readonly profileName: string,
		private readonly userDataDir: string,
		private readonly headless = false,
	) {}

	get isRunning(): boolean {
		return this._running;
	}

	async ensure(): Promise<void> {
		if (this._running && this.context) return;
		await this.launch();
	}

	private async launch(): Promise<void> {
		try {
			this.context = await chromium.launchPersistentContext(this.userDataDir, {
				headless: this.headless,
				args: LAUNCH_ARGS,
			});
		} catch (err) {
			throw new Error(
				`Browser launch failed. Run "npx playwright install chromium" to install binaries.\n${err}`,
			);
		}
		this._running = true;
		this.context.once('close', () => {
			this._running = false;
			this.context = null;
			this.pages.clear();
			this.pageIds = new WeakMap();
			this.aliases.clear();
			this.labels.clear();
			this.counter = 0;
			this.lastTargetId = null;
		});
		this.context.on('page', (page) => void this.trackPage(page));
		for (const page of this.context.pages()) {
			await this.trackPage(page);
		}
	}

	private async trackPage(page: Page): Promise<string> {
		const existing = this.pageIds.get(page);
		if (existing) return existing;

		const n = ++this.counter;
		const alias = `t${n}`;
		this.pageIds.set(page, alias);
		this.pages.set(alias, page);
		this.aliases.set(alias, alias);
		this.lastTargetId = alias;
		page.once('close', () => {
			this.pages.delete(alias);
			this.aliases.delete(alias);
			for (const [label, targetId] of this.labels.entries()) {
				if (targetId === alias) this.labels.delete(label);
			}
			if (this.lastTargetId === alias) {
				this.lastTargetId = [...this.pages.keys()].at(-1) ?? null;
			}
		});
		return alias;
	}

	async openTab(url: string, label?: string): Promise<BrowserTab> {
		const v = validateUrl(url);
		if (!v.ok) throw new Error(v.reason);
		const safeLabel = this.validateLabel(label);
		await this.ensure();
		const page = await this.context!.newPage();
		const targetId = await this.trackPage(page);
		try {
			await page.goto(v.url.href, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
			const finalUrl = this.validateFinalUrl(page.url());
			if (safeLabel) this.labels.set(safeLabel, targetId);
			const title = await page.title();
			return { targetId, alias: targetId, label: safeLabel, title, url: finalUrl };
		} catch (err) {
			await page.close().catch(() => {});
			throw err;
		}
	}

	async navigate(targetId: string | undefined, url: string): Promise<{ targetId: string; url: string }> {
		const v = validateUrl(url);
		if (!v.ok) throw new Error(v.reason);
		await this.ensure();
		const id = await this.resolveOrCreatePage(targetId);
		const page = this.pages.get(id)!;
		await page.goto(v.url.href, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
		const finalUrl = this.validateFinalUrl(page.url());
		this.lastTargetId = id;
		return { targetId: id, url: finalUrl };
	}

	async snapshot(targetId?: string): Promise<string> {
		await this.ensure();
		const id = this.resolveId(targetId);
		if (!id) throw new Error('no active tab');
		const page = this.pages.get(id)!;
		const url = safeOutputUrl(page.url());
		const title = await page.title();
		const aria = await page.ariaSnapshot();
		return `url: ${url}\ntitle: ${title}\n\n${aria}`;
	}

	async screenshot(targetId?: string): Promise<Buffer> {
		await this.ensure();
		const id = this.resolveId(targetId);
		if (!id) throw new Error('no active tab');
		const page = this.pages.get(id)!;
		return page.screenshot({ type: 'png', fullPage: false }) as Promise<Buffer>;
	}

	async act(targetId: string | undefined, request: Record<string, unknown>): Promise<unknown> {
		await this.ensure();
		const id = this.resolveId(targetId);
		if (!id) throw new Error('no active tab');
		const page = this.pages.get(id)!;
		const type = String(request.type ?? '');
		const ref = String(request.ref ?? '');

		switch (type) {
			case 'click':
				await resolveLocator(page, ref).click({ timeout: ACT_TIMEOUT });
				break;
			case 'fill':
				await resolveLocator(page, ref).fill(String(request.value ?? ''), { timeout: ACT_TIMEOUT });
				break;
			case 'press':
				if (ref) await resolveLocator(page, ref).press(String(request.key ?? ''));
				else await page.keyboard.press(String(request.key ?? ''));
				break;
			case 'select':
				await resolveLocator(page, ref).selectOption(String(request.value ?? ''), {
					timeout: ACT_TIMEOUT,
				});
				break;
			case 'scroll': {
				const dir = String(request.direction ?? 'down');
				const amount = Number(request.amount ?? 3);
				await page.evaluate(
					([d, a]) => window.scrollBy(0, d === 'up' ? -a * 100 : a * 100),
					[dir, amount] as [string, number],
				);
				break;
			}
			default:
				throw new Error(`unknown act type: ${type}`);
		}
		this.lastTargetId = id;
		return { ok: true, targetId: id, url: page.url() };
	}

	async tabs(): Promise<BrowserTab[]> {
		if (!this._running) return [];
		const result: BrowserTab[] = [];
		for (const [targetId, page] of this.pages.entries()) {
			const url = page.url();
			if (url === 'about:blank') continue;
			const title = await page.title().catch(() => '');
			const label = [...this.labels.entries()].find(([, id]) => id === targetId)?.[0];
			result.push({ targetId, alias: targetId, label, title, url: safeOutputUrl(url) });
		}
		return result;
	}

	async focus(targetId: string): Promise<void> {
		const id = this.resolveId(targetId);
		if (!id) throw new Error(`tab not found: ${targetId}`);
		await this.pages.get(id)!.bringToFront();
		this.lastTargetId = id;
	}

	async close(targetId: string): Promise<void> {
		const id = this.resolveId(targetId);
		if (!id) return;
		await this.pages.get(id)?.close();
	}

	async stop(): Promise<void> {
		if (this.context) {
			await this.context.close().catch(() => {});
		}
	}

	private resolveId(ref?: string): string | null {
		if (!ref) return this.lastTargetId ?? [...this.pages.keys()][0] ?? null;
		if (this.pages.has(ref)) return ref;
		const alias = this.aliases.get(ref);
		if (alias && this.pages.has(alias)) return alias;
		const labeled = this.labels.get(ref);
		if (labeled && this.pages.has(labeled)) return labeled;
		const matches = [...this.pages.keys()].filter((k) => k.startsWith(ref));
		if (matches.length > 1) throw new Error(`ambiguous tab reference: ${ref}`);
		return matches[0] ?? null;
	}

	private async resolveOrCreatePage(ref?: string): Promise<string> {
		const id = this.resolveId(ref);
		if (id) return id;
		if (ref) throw new Error(`tab not found: ${ref}`);
		const page = await this.context!.newPage();
		return this.trackPage(page);
	}

	private validateLabel(label?: string): string | undefined {
		if (label === undefined) return undefined;
		const trimmed = label.trim();
		if (!SAFE_LABEL_PATTERN.test(trimmed)) {
			throw new Error('label must match /^[A-Za-z0-9_.:-]{1,64}$/');
		}
		const existing = this.labels.get(trimmed);
		if (existing && this.pages.has(existing)) {
			throw new Error(`label already in use: ${trimmed}`);
		}
		return trimmed;
	}

	private validateFinalUrl(url: string): string {
		const v = validateUrl(url);
		if (!v.ok) throw new Error(`navigation blocked after redirect: ${v.reason}`);
		return v.url.href;
	}
}

function safeOutputUrl(url: string): string {
	if (url === 'about:blank') return url;
	return validateUrl(url).ok ? url : REDACTED_URL;
}

function resolveLocator(page: Page, ref: string) {
	// "role/name" format — e.g. "button/Submit", "textbox/Username"
	const slash = ref.indexOf('/');
	if (slash > 0) {
		const role = ref.slice(0, slash) as Parameters<Page['getByRole']>[0];
		const name = ref.slice(slash + 1);
		return page.getByRole(role, { name });
	}
	// CSS selector
	if (/^[#.[*]/.test(ref) || ref.includes(' > ')) return page.locator(ref);
	// Text
	return page.getByText(ref, { exact: false });
}
