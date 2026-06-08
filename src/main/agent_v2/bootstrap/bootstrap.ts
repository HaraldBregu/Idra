import { Workspace } from '../workspace/workspace';

export class Bootstrap {
	constructor(private readonly workspace = new Workspace()) {}

	getWorkspacePath(): string {
		return this.workspace.getWorkspacePath();
	}

	fileExists(filePath: string): Promise<boolean> {
		return this.workspace.fileExists(filePath);
	}

	async filesExist(filePaths: string[]): Promise<Record<string, boolean>> {
		const entries = await Promise.all(
			filePaths.map(async (filePath) => [filePath, await this.fileExists(filePath)] as const)
		);
		return Object.fromEntries(entries);
	}
}
