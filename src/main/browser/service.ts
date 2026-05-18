import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { BrowserProfile, BrowserProfileStatus, BrowserStatus, BrowserTab } from './types';
import { BrowserRuntime } from './runtime';

const DEFAULT_BASE_DIR = path.join(os.homedir(), '.friday', 'browser');
const DEFAULT_PROFILE = 'default';
const PROFILE_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;

const BUILTIN_PROFILES: BrowserProfile[] = [
	{ name: DEFAULT_PROFILE, driver: 'managed', color: 'blue' },
	{ name: 'openclaw', driver: 'managed', color: 'green' },
	{ name: 'user', driver: 'existing-session', attachOnly: true, color: 'purple' },
];

export class BrowserService {
	private readonly runtimes = new Map<string, BrowserRuntime>();
	private readonly profilesByName: Map<string, BrowserProfile>;

	constructor(
		private readonly baseDir: string = DEFAULT_BASE_DIR,
		private readonly headless = false,
		profiles: BrowserProfile[] = BUILTIN_PROFILES,
	) {
		this.profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
	}

	private async runtime(profile: string): Promise<BrowserRuntime> {
		const config = this.resolveProfile(profile);
		if (config.driver !== 'managed' || config.attachOnly) {
			throw new Error(
				`Browser profile "${config.name}" is ${config.attachOnly ? 'attach-only' : config.driver}; no attach backend is configured.`,
			);
		}
		if (!this.runtimes.has(config.name)) {
			const dir = config.userDataDir ?? path.join(this.baseDir, `profile-${config.name}`);
			await fs.mkdir(dir, { recursive: true });
			this.runtimes.set(config.name, new BrowserRuntime(config.name, dir, this.headless));
		}
		return this.runtimes.get(config.name)!;
	}

	async status(profile: string): Promise<BrowserStatus> {
		const config = this.resolveProfile(profile);
		const rt = this.runtimes.get(config.name);
		return { running: rt?.isRunning ?? false, profile: config.name, tabs: rt ? await rt.tabs() : [] };
	}

	async start(profile: string): Promise<void> {
		const rt = await this.runtime(profile);
		await rt.ensure();
	}

	async stop(profile: string): Promise<boolean> {
		const config = this.resolveProfile(profile);
		const rt = this.runtimes.get(config.name);
		if (!rt) return false;
		await rt.stop();
		return true;
	}

	profiles(): BrowserProfileStatus[] {
		const names = new Set([...this.profilesByName.keys(), ...this.runtimes.keys()]);
		return [...names].map((name) => {
			const profile = this.resolveProfile(name);
			return {
				name: profile.name,
				driver: profile.driver,
				attachOnly: profile.attachOnly,
				color: profile.color,
				running: this.runtimes.get(profile.name)?.isRunning ?? false,
			};
		});
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
		const config = this.resolveProfile(profile);
		const rt = this.runtimes.get(config.name);
		return { running: rt?.isRunning ?? false, tabs: rt ? await rt.tabs() : [] };
	}

	async focus(profile: string, targetId: string): Promise<void> {
		const rt = this.requireRunningRuntime(profile);
		return rt.focus(targetId);
	}

	async close(profile: string, targetId: string): Promise<void> {
		const rt = this.requireRunningRuntime(profile);
		return rt.close(targetId);
	}

	async disposeAll(): Promise<void> {
		await Promise.all([...this.runtimes.values()].map((rt) => rt.stop()));
		this.runtimes.clear();
	}

	private resolveProfile(profile: string | undefined): BrowserProfile {
		const name = profile || DEFAULT_PROFILE;
		if (!PROFILE_NAME_PATTERN.test(name)) {
			throw new Error('profile must match /^[A-Za-z0-9_.:-]{1,64}$/');
		}
		return this.profilesByName.get(name) ?? { name, driver: 'managed' };
	}

	private requireRunningRuntime(profile: string): BrowserRuntime {
		const config = this.resolveProfile(profile);
		const rt = this.runtimes.get(config.name);
		if (!rt || !rt.isRunning) throw new Error(`browser profile "${config.name}" is not running`);
		return rt;
	}
}
