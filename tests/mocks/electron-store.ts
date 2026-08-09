import path from 'node:path';

interface StoreOptions<T> {
	name?: string;
	cwd?: string;
	defaults?: T;
}

export default class Store<T extends Record<string, unknown> = Record<string, unknown>> {
	readonly path: string;
	private value: T;

	constructor(options: StoreOptions<T> = {}) {
		this.path = path.join(options.cwd ?? '/tmp', `${options.name ?? 'config'}.json`);
		this.value = structuredClone(options.defaults ?? ({} as T));
	}

	get store(): T {
		return this.value;
	}

	set store(value: T) {
		this.value = structuredClone(value);
	}

	get<K extends keyof T>(key: K): T[K] {
		return this.value[key];
	}

	set<K extends keyof T>(key: K, value: T[K]): void {
		this.value = { ...this.value, [key]: value };
	}

	delete<K extends keyof T>(key: K): void {
		const value = { ...this.value };
		delete value[key];
		this.value = value;
	}
}
