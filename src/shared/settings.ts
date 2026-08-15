import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { userDataLocation } from './user_data_location';

export type Settings = Record<string, unknown>;

export class SettingsService {
	private readonly filePath: string;
	private settings: Settings;

	constructor(filePath = path.join(userDataLocation(), 'settings.json')) {
		this.filePath = filePath;
		if (!fs.existsSync(filePath)) {
			this.settings = {};
			this.save();
			return;
		}

		const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(`Settings file must contain a JSON object: ${filePath}`);
		}
		this.settings = parsed as Settings;
	}

	get<T = unknown>(key: string): T | undefined {
		return structuredClone(this.settings[key]) as T | undefined;
	}

	set(key: string, value: unknown): void {
		this.settings[key] = structuredClone(value);
	}

	getAll(): Settings {
		return structuredClone(this.settings);
	}

	save(): void {
		fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
		const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
		try {
			fs.writeFileSync(temporaryPath, `${JSON.stringify(this.settings, null, 2)}\n`, {
				mode: 0o600,
			});
			fs.renameSync(temporaryPath, this.filePath);
		} finally {
			fs.rmSync(temporaryPath, { force: true });
		}
	}
}
