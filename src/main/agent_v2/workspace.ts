import path from 'node:path';

export class Workspace {
	private readonly workspacePath: string;

	constructor(workspacePath = process.cwd()) {
		this.workspacePath = path.resolve(workspacePath);
	}

	getWorkspace(): string {
		return this.workspacePath;
	}
}
