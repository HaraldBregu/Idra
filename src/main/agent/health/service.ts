import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import Store from 'electron-store';
import { app } from 'electron';
import { Inject, Service } from 'typedi';
import { AgentService } from '../main';
import type { HealthActiveHours, HealthSettings } from './types';
import { randomUUID } from 'node:crypto';

const HEARTBEAT_STORE_NAME = 'settings';
const HEARTBEAT_AGENT_ID = 'heartbeat';
const HEARTBEAT_INTERVALS_MS = {
	'0m': 0,
	'1m': 60 * 1000,
	'30m': 30 * 60 * 1000,
	'1h': 60 * 60 * 1000,
} as const;
const HEARTBEAT_PROMPT = "Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.";

export const HEALTH_DEFAULT_SETTINGS: HealthSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};

export interface HealthServiceOptions {
	cwd?: string;
}

@Service()
export class HealthService {
	private readonly store: Store<HealthSettings>;
	private readonly storeDirectory: string;
	private timer: NodeJS.Timeout | undefined;

	@Inject(() => AgentService)
	private readonly agent!: AgentService;

	constructor(options: HealthServiceOptions = {}) {
		this.storeDirectory = options.cwd ?? resolveHeartbeatStorePath();
		this.store = new Store<HealthSettings>({
			name: HEARTBEAT_STORE_NAME,
			cwd: this.storeDirectory,
			accessPropertiesByDotNotation: false,
			defaults: HEALTH_DEFAULT_SETTINGS,
		});
		this.ensureFile();
		this.syncSchedule();
	}

	getSettings(): HealthSettings {
		return this.store.store;
	}

	updateSettings(patch: Partial<HealthSettings>): HealthSettings {
		const next = {
			...this.getSettings(),
			...patch,
		};
		this.store.store = next;
		this.syncSchedule();
		return next;
	}

	resetSettings(): HealthSettings {
		this.store.store = HEALTH_DEFAULT_SETTINGS;
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
		if (settings.target === 'none') return;
		if (!withinActiveHours(settings.activeHours)) return;
		if (settings.skipWhenBusy && this.agent.isBusy(HEARTBEAT_AGENT_ID)) return;
		try {
			const agentId = randomUUID();
			const sessionId = randomUUID();
			void await this.agent.send(HEARTBEAT_PROMPT, agentId, {
				category: 'heartbeat',
				sessionId,
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

function withinActiveHours(hours: HealthActiveHours | undefined): boolean {
	if (!hours) return true;
	const start = parseHm(hours.start);
	const end = parseHm(hours.end);
	if (start === undefined || end === undefined || start === end) return true;
	const now = new Date();
	const minutes = now.getHours() * 60 + now.getMinutes();
	// ponytail: wraps past midnight when start > end (e.g. 22:00–06:00)
	return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

function parseHm(value: string): number | undefined {
	const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
	if (!match) return undefined;
	const h = Number(match[1]);
	const m = Number(match[2]);
	if (h > 23 || m > 59) return undefined;
	return h * 60 + m;
}

function normalizeEvery(value: HealthSettings['every']): keyof typeof HEARTBEAT_INTERVALS_MS {
	if (value in HEARTBEAT_INTERVALS_MS) {
		return value as keyof typeof HEARTBEAT_INTERVALS_MS;
	}
	return HEALTH_DEFAULT_SETTINGS.every;
}
