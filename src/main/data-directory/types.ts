export interface AgentDataDirectoryServiceOptions {
	appDataPath?: string;
	appDirectoryName?: string;
}

export interface AgentDataDirectoryServicePort {
	getRootPath(): string;
	ensureRoot(): Promise<string>;
	resolve(...segments: string[]): string;
	resolveExisting(...segments: string[]): Promise<string>;
}
