export interface InjectionToken<T> {
	readonly id: symbol;
	readonly name: string;
	readonly value?: T;
}

export function createToken<T>(name: string): InjectionToken<T> {
	return Object.freeze({ id: Symbol(name), name });
}
