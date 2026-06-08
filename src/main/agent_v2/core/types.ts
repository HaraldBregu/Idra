import type { Container } from './container';
import type { InjectionToken } from './token';

export type InjectableClass<T> = new (...dependencies: unknown[]) => T;

export type Provider<T> =
	| { useValue: T }
	| { useFactory: (container: Container) => T; singleton?: boolean }
	| { useClass: InjectableClass<T>; dependencies?: InjectionToken<unknown>[]; singleton?: boolean };
