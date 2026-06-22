import path from 'node:path';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import Store from 'electron-store';
import { app } from 'electron';
import { Service } from 'typedi';
import type { HeartbeatSettings } from './types';

const HEARTBEAT_STORE_NAME = 'settings';

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

	constructor(options: HeartbeatServiceOptions = {}) {
		this.storeDirectory = options.cwd ?? resolveHeartbeatStorePath();
		this.store = new Store<HeartbeatSettings>({
			name: HEARTBEAT_STORE_NAME,
			cwd: this.storeDirectory,
			accessPropertiesByDotNotation: false,
			defaults: HEARTBEAT_DEFAULT_SETTINGS,
		});
		this.ensureFile();
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
		return next;
	}

	resetSettings(): HeartbeatSettings {
		this.store.store = HEARTBEAT_DEFAULT_SETTINGS;
		return this.getSettings();
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
