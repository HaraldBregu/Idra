export abstract class Memory {
	abstract getPath(): string;
	abstract getText(): Promise<string>;
}
