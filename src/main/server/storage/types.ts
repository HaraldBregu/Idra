export type StoredSettings = Record<string, unknown>;

export interface SettingsResult {
	exists: boolean;
	settings: StoredSettings;
}

export interface StoredFile {
	path: string;
	size: number;
}

export interface StoredFileContent extends StoredFile {
	content: string;
}
