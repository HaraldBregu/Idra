export interface McpServerConfig {
	id: string;
	command: string;
	args: string[];
	cwd: string;
	env?: Record<string, string>;
}
