import fs from 'node:fs';
import path from 'node:path';

interface StoreOptions<T extends object> {
	name: string;
	cwd: string;
	defaults: T;
	accessPropertiesByDotNotation?: boolean;
}

export class JsonStore<T extends object> {
	readonly path: string;
	private defaults: T;
	private value: T;

	constructor(options: StoreOptions<T>) {
		this.path = path.join(options.cwd, `${options.name}.json`);
		this.defaults = structuredClone(options.defaults);
		this.value = this.read();
	}

	get store(): T {
		return structuredClone(this.value);
	}

	set store(value: T) {
		this.value = structuredClone(value);
		this.write();
	}

	get<K extends keyof T>(key: K): T[K] {
		return structuredClone(this.value[key]);
	}

	set<K extends keyof T>(key: K, value: T[K]): void {
		this.value[key] = structuredClone(value);
		this.write();
	}

	delete<K extends keyof T>(key: K): void {
		delete this.value[key];
		this.write();
	}

	private read(): T {
		try {
			const stored = JSON.parse(fs.readFileSync(this.path, 'utf8')) as Partial<T>;
			return { ...structuredClone(this.defaults), ...stored };
		} catch {
			return structuredClone(this.defaults);
		}
	}

	private write(): void {
		fs.mkdirSync(path.dirname(this.path), { recursive: true });
		const temporaryPath = `${this.path}.${process.pid}.tmp`;
		fs.writeFileSync(temporaryPath, `${JSON.stringify(this.value, null, 2)}\n`, { mode: 0o600 });
		fs.renameSync(temporaryPath, this.path);
	}
}
