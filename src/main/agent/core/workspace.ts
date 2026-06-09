export abstract class Workspace {
	abstract getPath(): string;
	abstract getAgentText(): Promise<string>;
}
