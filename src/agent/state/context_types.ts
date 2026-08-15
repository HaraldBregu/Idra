export interface FileToolState {
	toolName: string;
	path: string;
	directory: string;
}

export interface FileAccessContext {
	readDirectories: Set<string>;
	createdFiles: Set<string>;
}

export interface RunContext {
	fileAccess: FileAccessContext;
}
