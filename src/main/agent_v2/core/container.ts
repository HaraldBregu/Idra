import type { InjectionToken } from './token';
import type { Provider } from './types';

export class Container {
	private readonly providers = new Map<symbol, Provider<unknown>>();
	private readonly instances = new Map<symbol, unknown>();

	constructor(private readonly parent?: Container) {}

	register<T>(token: InjectionToken<T>, provider: Provider<T>): this {
		this.providers.set(token.id, provider);
		this.instances.delete(token.id);
		return this;
	}

	resolve<T>(token: InjectionToken<T>): T {
		if (this.instances.has(token.id)) return this.instances.get(token.id) as T;

		const provider = this.providers.get(token.id) as Provider<T> | undefined;
		if (!provider) {
			if (this.parent) return this.parent.resolve(token);
			throw new Error(`No provider registered for ${token.name}.`);
		}

		if ('useValue' in provider) return provider.useValue;

		if ('useFactory' in provider) {
			const value = provider.useFactory(this);
			if (provider.singleton) this.instances.set(token.id, value);
			return value;
		}

		const dependencies = provider.dependencies?.map((dependency) => this.resolve(dependency)) ?? [];
		const value = new provider.useClass(...dependencies);
		if (provider.singleton) this.instances.set(token.id, value);
		return value;
	}

	has(token: InjectionToken<unknown>): boolean {
		return this.providers.has(token.id) || Boolean(this.parent?.has(token));
	}

	createChild(): Container {
		return new Container(this);
	}
}
