import type { JSONSchema, ToolContextState } from './types';

export class ToolContext {
	private readonly state: ToolContextState;

	constructor(initialState: Partial<ToolContextState> = {}) {
		this.state = {
			currentDirectory: initialState.currentDirectory,
			currentFile: initialState.currentFile,
			currentFiles: [...new Set(initialState.currentFiles ?? [])],
		};

		if (this.state.currentFile) this.addCurrentFile(this.state.currentFile);
	}

	get currentDirectory(): string | undefined {
		return this.state.currentDirectory;
	}

	get currentFile(): string | undefined {
		return this.state.currentFile;
	}

	get currentFiles(): readonly string[] {
		return [...this.state.currentFiles];
	}

	setCurrentDirectory(currentDirectory: string): void {
		this.state.currentDirectory = currentDirectory;
	}

	setCurrentFile(currentFile: string): void {
		this.state.currentFile = currentFile;
		this.addCurrentFile(currentFile);
	}

	addCurrentFile(currentFile: string): void {
		if (!this.state.currentFiles.includes(currentFile)) {
			this.state.currentFiles.push(currentFile);
		}
	}

	setCurrentFiles(currentFiles: string[]): void {
		this.state.currentFiles = [...new Set(currentFiles)];
	}

	snapshot(): ToolContextState {
		return {
			currentDirectory: this.state.currentDirectory,
			currentFile: this.state.currentFile,
			currentFiles: [...this.state.currentFiles],
		};
	}
}

export abstract class Tool {
	abstract readonly name: string;
	readonly description?: string;
	readonly schema?: JSONSchema;

	constructor(readonly context = new ToolContext()) {}

	abstract run(input: Record<string, unknown>): Promise<unknown> | unknown;
}
