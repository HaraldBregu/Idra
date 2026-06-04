import path from 'node:path';

export const app = {
	getPath(name: string): string {
		return path.join(process.cwd(), '.test-electron', name);
	},
};

export const shell = {
	async openExternal(_url: string): Promise<void> {
		return undefined;
	},
};

export const ipcMain = {
	handle(): void {
		return undefined;
	},
};
