/**
 * Jest setup file for the "main" project.
 * Seeds globalThis.__VITE_ENV__ so that import.meta.env references
 * rewritten by vite-env-transform resolve to a defined object instead
 * of crashing with "Cannot read properties of undefined".
 */
(globalThis as typeof globalThis & { __VITE_ENV__: Record<string, unknown> }).__VITE_ENV__ = {
	MODE: 'test',
	DEV: false,
	PROD: false,
	BASE_URL: '/',
	SSR: false,
};
