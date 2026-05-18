import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { BrowserStatus, BrowserTab } from './types';
import { BrowserRuntime } from './runtime';

const DEFAULT_BASE_DIR = path.join(os.homedir(), '.friday', 'browser');

export class BrowserService {
	private readonly runtimes = new Map<string, BrowserRuntime>();

	constructor(
		private readonly baseDir: string = DEFAULT_BASE_DIR,
		private readonly headless = false,
	) {}

	private async runtime(profile: string): Promise<BrowserRuntime> {
		if (!this.runtimes.has(profile)) {
			const dir = path.join(this.baseDir, `profile-${profile}`);
			await fs.mkdir(dir, { recursive: true });
			this.runtimes.set(profile, new BrowserRuntime(profile, dir, this.headless));
		}
		return this.runtimes.get(profile)!;
	}

	async status(profile: string): Promise<BrowserStatus> {
		const rt = await this.runtime(profile);
		return { running: rt.isRunning, profile, tabs: await rt.tabs() };
	}

	async start(profile: string): Promise<void> {
		const rt = await this.runtime(profile);
		await rt.ensure();
	}

	async stop(profile: string): Promise<void> {
		const rt = this.runtimes.get(profile);
		if (rt) await rt.stop();
	}

	profiles(): string[] {
		return [...this.runtimes.keys()];
	}

	async openTab(profile: string, url: string, label?: string): Promise<BrowserTab> {
		const rt = await this.runtime(profile);
		return rt.openTab(url, label);
	}

	async navigate(
		profile: string,
		targetId: string | undefined,
		url: string,
	): Promise<{ targetId: string; url: string }> {
		const rt = await this.runtime(profile);
		return rt.navigate(targetId, url);
	}

	async snapshot(profile: string, targetId?: string): Promise<string> {
		const rt = await this.runtime(profile);
		return rt.snapshot(targetId);
	}

	async screenshot(profile: string, targetId?: string): Promise<Buffer> {
		const rt = await this.runtime(profile);
		return rt.screenshot(targetId);
	}

	async act(
		profile: string,
		targetId: string | undefined,
		request: Record<string, unknown>,
	): Promise<unknown> {
		const rt = await this.runtime(profile);
		return rt.act(targetId, request);
	}

	async tabs(profile: string): Promise<{ running: boolean; tabs: BrowserTab[] }> {
		const rt = await this.runtime(profile);
		return { running: rt.isRunning, tabs: await rt.tabs() };
	}

	async focus(profile: string, targetId: string): Promise<void> {
		const rt = await this.runtime(profile);
		return rt.focus(targetId);
	}

	async close(profile: string, targetId: string): Promise<void> {
		const rt = await this.runtime(profile);
		return rt.close(targetId);
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this.runtimes.values()].map((rt) => rt.stop()));
		this.runtimes.clear();
	}
}
