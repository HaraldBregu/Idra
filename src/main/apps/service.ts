import { promises as fs } from 'node:fs';
import path from 'node:path';
import { shell } from 'electron';
import type { LoggerService } from './logger';
import type { AppInfo } from '../shared/apps';
import type { UserDataDirectoryServicePort } from './user-data';

const APP_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export class AppsService {
	readonly #logger: LoggerService;
	readonly #userDataDirectory: UserDataDirectoryServicePort;

	constructor(logger: LoggerService, userDataDirectory: UserDataDirectoryServicePort) {
		this.#logger = logger;
		this.#userDataDirectory = userDataDirectory;
	}

	getAppsRoot(): string {
		return this.#userDataDirectory.resolve('apps');
	}

	async list(): Promise<AppInfo[]> {
		const appsRoot = this.getAppsRoot();
		try {
			const entries = await fs.readdir(appsRoot, { withFileTypes: true });
			const apps = entries
				.filter((entry) => entry.isDirectory())
				.filter((entry) => this.normalizeAppId(entry.name) !== null)
				.map((entry) => path.join(appsRoot, entry.name));
			const details = await Promise.all(
				apps.map((folderPath) => this.loadManifest(path.basename(folderPath), folderPath))
			);

			return details.filter((entry): entry is AppInfo => entry !== null);
		} catch (error) {
			if ((error as { code?: string }).code === 'ENOENT') return [];
			this.#logger.error('AppsService', 'Failed to list apps', { error });
			return [];
		}
	}

	async openFolder(appId: string): Promise<void> {
		const safeAppId = this.normalizeAppId(appId);
		if (safeAppId === null) throw new Error('Invalid app id');

		const folderPath = path.join(this.getAppsRoot(), safeAppId);
		const result = await shell.openPath(folderPath);
		if (result) {
			throw new Error(`Could not open app folder: ${result}`);
		}
	}

	async delete(appId: string): Promise<void> {
		const safeAppId = this.normalizeAppId(appId);
		if (safeAppId === null) throw new Error('Invalid app id');

		const folderPath = path.join(this.getAppsRoot(), safeAppId);
		await fs.rm(folderPath, { recursive: true, force: true });
	}

	private async loadManifest(appId: string, folderPath: string): Promise<AppInfo | null> {
		const manifestPath = path.join(folderPath, 'manifest.json');
		try {
			const manifestContent = await fs.readFile(manifestPath, 'utf8');
			const manifest = JSON.parse(manifestContent) as AppInfo['manifest'];
			if (
				typeof manifest !== 'object' ||
				manifest === null ||
				typeof manifest.name !== 'string' ||
				typeof manifest.version !== 'string'
			) {
				return null;
			}

			const iconDataUrl = await this.getIconDataUrl(manifest, folderPath);
			return {
				id: appId,
				folderPath,
				manifest,
				...(iconDataUrl ? { iconDataUrl } : {}),
			};
		} catch {
			return null;
		}
	}

	private async getIconDataUrl(manifest: AppInfo['manifest'], folderPath: string) {
		if (typeof manifest.icon !== 'string' || manifest.icon.trim() === '') return undefined;

		const iconPath = path.join(folderPath, manifest.icon);
		try {
			const buffer = await fs.readFile(iconPath);
			return `data:image/png;base64,${buffer.toString('base64')}`;
		} catch {
			return undefined;
		}
	}

	private normalizeAppId(value: string): string | null {
		const normalized = value.trim();
		if (!APP_ID.test(normalized)) return null;
		if (normalized.includes('..') || /[\\/]/.test(normalized)) return null;
		return normalized;
	}
}

