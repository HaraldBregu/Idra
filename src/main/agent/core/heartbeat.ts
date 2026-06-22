export abstract class Heartbeat {
	abstract getText(): Promise<string>;
}