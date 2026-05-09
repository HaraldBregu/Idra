/**
 * Jest setup file for the "renderer" project.
 * Adds browser polyfills needed by jsdom-based tests.
 */

// Polyfill matchMedia (not implemented by jsdom)
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});
