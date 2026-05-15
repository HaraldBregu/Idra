import fs from 'node:fs';
import path from 'node:path';
import { app, shell } from 'electron';
import type { LoggerService } from '../logger';
import type { AppInfo, AppManifest } from '../../shared/apps';

const ICON_MIME: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
};

export class AppsService {
	constructor(private readonly logger: LoggerService) {}

	getAppsRoot(): string {
		const root = path.join(app.getPath('userData'), 'apps');
		fs.mkdirSync(root, { recursive: true });
		return root;
	}

	async list(): Promise<AppInfo[]> {
		const root = this.getAppsRoot();
		const entries = await fs.promises.readdir(root, { withFileTypes: true });
		const apps: AppInfo[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const folderPath = path.join(root, entry.name);
			const manifest = await this.readManifest(folderPath, entry.name);
			if (!manifest) continue;

			const iconDataUrl = await this.readIcon(folderPath, manifest.icon);
			apps.push({ id: entry.name, folderPath, manifest, iconDataUrl });
		}

		apps.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
		return apps;
	}

	async openFolder(id: string): Promise<void> {
		const folderPath = this.resolveAppDir(id);
		const err = await shell.openPath(folderPath);
		if (err) {
			this.logger.warn('AppsService', `Failed to open app folder: ${id}`, { error: err });
			throw new Error(`Could not open app folder: ${err}`);
		}
	}

	async delete(id: string): Promise<void> {
		const folderPath = this.resolveAppDir(id);
		await fs.promises.rm(folderPath, { recursive: true, force: true });
		this.logger.info('AppsService', `Deleted app folder: ${id}`);
	}

	private resolveAppDir(id: string): string {
		if (!id || id.includes('/') || id.includes('\\') || id.includes('..')) {
			throw new Error(`Invalid app id: ${id}`);
		}
		const root = this.getAppsRoot();
		const folderPath = path.join(root, id);
		const resolved = path.resolve(folderPath);
		if (path.dirname(resolved) !== path.resolve(root)) {
			throw new Error(`App id escapes apps root: ${id}`);
		}
		return resolved;
	}

	private async readManifest(folderPath: string, id: string): Promise<AppManifest | null> {
		const manifestPath = path.join(folderPath, 'manifest.json');
		try {
			const raw = await fs.promises.readFile(manifestPath, 'utf8');
			const parsed = JSON.parse(raw) as Partial<AppManifest>;
			if (typeof parsed.name !== 'string' || typeof parsed.version !== 'string') {
				this.logger.warn('AppsService', `Skipping ${id}: manifest missing name or version`);
				return null;
			}
			return {
				name: parsed.name,
				version: parsed.version,
				description: typeof parsed.description === 'string' ? parsed.description : undefined,
				icon: typeof parsed.icon === 'string' ? parsed.icon : undefined,
			};
		} catch (err) {
			const code = (err as NodeJS.ErrnoException).code;
			if (code !== 'ENOENT') {
				this.logger.warn('AppsService', `Skipping ${id}: cannot read manifest`, {
					error: (err as Error).message,
				});
			}
			return null;
		}
	}

	private async readIcon(folderPath: string, icon: string | undefined): Promise<string | undefined> {
		if (!icon) return undefined;
		if (icon.includes('..') || path.isAbsolute(icon)) return undefined;
		const iconPath = path.join(folderPath, icon);
		const resolved = path.resolve(iconPath);
		if (!resolved.startsWith(path.resolve(folderPath) + path.sep)) return undefined;
		const mime = ICON_MIME[path.extname(icon).toLowerCase()];
		if (!mime) return undefined;
		try {
			const buf = await fs.promises.readFile(resolved);
			return `data:${mime};base64,${buf.toString('base64')}`;
		} catch {
			return undefined;
		}
	}
}
