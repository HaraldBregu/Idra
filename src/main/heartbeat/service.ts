import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import Store from 'electron-store';
import { app } from 'electron';
import { Inject, Service } from 'typedi';
import { SettingsService } from '../agent/settings';
import { SessionService } from '../agent/session';
import { WorkspaceService } from '../agent/workspace';
import { AgentRuntime } from '../agent/loop/loop';
import { AgentModel } from '../llm';
import { CronService } from '../cron';
import type { HeartbeatActiveHours, HeartbeatSettings } from './types';

const HEARTBEAT_STORE_NAME = 'settings';
const HEARTBEAT_AGENT_ID = 'heartbeat';
const HEARTBEAT_INTERVALS_MS = {
	'0m': 0,
	'30m': 30 * 60 * 1000,
	'1h': 60 * 60 * 1000,
} as const;

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

	@Inject(() => SettingsService)
	private readonly agentSettingsStore!: SettingsService;

	@Inject(() => SessionService)
	private readonly session!: SessionService;

	@Inject(() => WorkspaceService)
	private readonly agentWorkspace!: WorkspaceService;

	@Inject(() => CronService)
	private readonly cron!: CronService;

	private readonly activeRuns = new Set<string>();

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
		if (settings.target === 'none') return;
		if (!withinActiveHours(settings.activeHours)) return;
		if (settings.skipWhenBusy && this.activeRuns.has(HEARTBEAT_AGENT_ID)) return;
		this.activeRuns.add(HEARTBEAT_AGENT_ID);
		console.log('[HeartbeatService]', 'Running heartbeat', {
			every: settings.every,
			target: settings.target,
		});
		try {
			const sessionInput = {
				task: 'chat' as const,
				message: '',
				category: 'task' as const,
				sessionId: HEARTBEAT_AGENT_ID,
			};
			const session = this.session.create(sessionInput, sessionInput.category);
			const runtime = new AgentRuntime(
				this.agentWorkspace,
				this.agentSettingsStore,
				session,
				new AgentModel(),
				this.cron
			);
			const input = {
				...sessionInput,
				maxRetries: 1,
				tools: [],
			};
			const stream = runtime.run(input);
			for await (const event of stream) {
				session.appendRun(event);
			}
		} catch (error) {
			console.error('[HeartbeatService]', 'Heartbeat run failed.', error);
		} finally {
			this.activeRuns.delete(HEARTBEAT_AGENT_ID);
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

function withinActiveHours(hours: HeartbeatActiveHours | undefined): boolean {
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

function normalizeEvery(value: HeartbeatSettings['every']): keyof typeof HEARTBEAT_INTERVALS_MS {
	if (value in HEARTBEAT_INTERVALS_MS) {
		return value as keyof typeof HEARTBEAT_INTERVALS_MS;
	}
	return HEARTBEAT_DEFAULT_SETTINGS.every;
}
