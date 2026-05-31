export type Logger = {
	event(name: string, data?: Record<string, unknown>): void;
};
