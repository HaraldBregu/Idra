export interface InjectionToken<T> {
	readonly id: symbol;
	readonly name: string;
}

export function createToken<T>(name: string): InjectionToken<T> {
	return Object.freeze({ id: Symbol(name), name });
}
