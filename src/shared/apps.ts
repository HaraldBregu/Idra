export interface AppManifest {
	name: string;
	version: string;
	description?: string;
	icon?: string;
	[key: string]: unknown;
}

export interface AppInfo {
	id: string;
	folderPath: string;
	manifest: AppManifest;
	iconDataUrl?: string;
}

