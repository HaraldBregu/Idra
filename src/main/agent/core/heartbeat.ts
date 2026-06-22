export abstract class Heartbeat {
	abstract getPath(): string;
	abstract getText(): Promise<string>;
}