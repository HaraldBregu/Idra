import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import Store from 'electron-store';
import { app } from 'electron';
import { Inject, Service } from 'typedi';
import { AgentService } from '../agent/service';
import type { HeartbeatSettings } from './types';

const HEARTBEAT_STORE_NAME = 'settings';
const HEARTBEAT_AGENT_ID = 'heartbeat';
const HEARTBEAT_INTERVALS_MS = {
	'0m': 0,
	'30m': 30 * 60 * 1000,
	'1h': 60 * 60 * 1000,
} as const;
const HEARTBEAT_PROMPT =
	'Run a heartbeat check using the HEARTBEAT.md guidance. If nothing is noteworthy, respond exactly HEARTBEAT_OK.';

export const HEARTBEAT_DEFAULT_SETTINGS: HeartbeatSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};

export interface HeartbeatServiceOptions {
	cwd?: string;
}

@Service({ factory: () => new HeartbeatService() })
export class HeartbeatService {
	private readonly store: Store<HeartbeatSettings>;
	private readonly storeDirectory: string;
	private timer: NodeJS.Timeout | undefined;

	@Inject(() => AgentService)
	private readonly agent!: AgentService;

	constructor(options: HeartbeatServiceOptions = {}) {
		this.storeDirectory = options.cwd ?? resolveHeartbeatStorePath();
		this.store = new Store<HeartbeatSettings>({
			name: HEARTBEAT_STORE_NAME,
			cwd: this.storeDirectory,
			accessPropertiesByDotNotation: false,
			defaults: HEARTBEAT_DEFAULT_SETTINGS,
		});
		this.ensureFile();
		this.syncSchedule();
	}

	getSettings(): HeartbeatSettings {
		return this.store.store;
	}

	updateSettings(patch: Partial<HeartbeatSettings>): HeartbeatSettings {
		const next = {
			...this.getSettings(),
			...patch,
		};
		this.store.store = next;
		this.syncSchedule();
		return next;
	}

	resetSettings(): HeartbeatSettings {
		this.store.store = HEARTBEAT_DEFAULT_SETTINGS;
		this.syncSchedule();
		return this.getSettings();
	}

	destroy(): void {
		this.clearTimer();
	}

	private ensureFile(): void {
		const storePath = path.join(this.storeDirectory, `${HEARTBEAT_STORE_NAME}.json`);
		if (existsSync(storePath)) return;
		mkdirSync(path.dirname(storePath), { recursive: true });
		const legacyStorePath = path.join(
			resolveLegacyHeartbeatStorePath(),
			`${HEARTBEAT_STORE_NAME}.json`
		);
		if (existsSync(legacyStorePath)) {
			copyFileSync(legacyStorePath, storePath);
			return;
		}
		writeFileSync(storePath, JSON.stringify(this.getSettings(), null, '\t'));
	}

	private syncSchedule(): void {
		this.clearTimer();
		const every = normalizeEvery(this.getSettings().every);
		const intervalMs = HEARTBEAT_INTERVALS_MS[every];
		if (intervalMs <= 0) return;
		this.timer = setInterval(() => {
			void this.run();
		}, intervalMs);
		this.timer.unref?.();
	}

	private clearTimer(): void {
		if (!this.timer) return;
		clearInterval(this.timer);
		this.timer = undefined;
	}

	private async run(): Promise<void> {
		const settings = this.getSettings();
		if (normalizeEvery(settings.every) === '0m') return;
		if (settings.skipWhenBusy && this.agent.isBusy(HEARTBEAT_AGENT_ID)) return;
		try {
			await this.agent.send(HEARTBEAT_PROMPT, HEARTBEAT_AGENT_ID, {
				category: 'task',
				sessionId: HEARTBEAT_AGENT_ID,
			});
		} catch (error) {
			console.error('[HeartbeatService]', 'Heartbeat run failed.', error);
		}
	}
}

function resolveHeartbeatStorePath(): string {
	try {
		return path.resolve(app.getPath('appData'), app.getName(), 'heartbeat');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, app?.getName?.() ?? 'Friday', 'heartbeat');
	}
}

function resolveLegacyHeartbeatStorePath(): string {
	try {
		return path.resolve(app.getPath('appData'), 'heartbeat');
	} catch {
		const base = process.env.APPDATA ?? process.env.XDG_CONFIG_HOME ?? process.env.HOME ?? process.cwd();
		return path.resolve(base, 'heartbeat');
	}
}

function normalizeEvery(value: HeartbeatSettings['every']): keyof typeof HEARTBEAT_INTERVALS_MS {
	if (value in HEARTBEAT_INTERVALS_MS) {
		return value as keyof typeof HEARTBEAT_INTERVALS_MS;
	}
	return HEARTBEAT_DEFAULT_SETTINGS.every;
}
