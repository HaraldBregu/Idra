export abstract class Workspace {
	abstract getPath(): string;
	abstract getAgentText(): Promise<string>;
	abstract getBootstrapText(): Promise<string>;
	abstract getHeartbeatText(): Promise<string>;
	abstract getIdentityText(): Promise<string>;
	abstract getMemoryText(): Promise<string>;
	abstract getSoulText(): Promise<string>;
	abstract getToolsText(): Promise<string>;
	abstract getUserText(): Promise<string>;
	abstract setIdentityText(content: string): Promise<void>;
}
