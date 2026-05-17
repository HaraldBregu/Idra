/**
 * Jest setup file for the "renderer" project.
 * Adds browser polyfills needed by jsdom-based tests.
 */

// Polyfill PointerEvent (not implemented by jsdom, required by base-ui Switch)
if (typeof globalThis.PointerEvent === 'undefined') {
	// @ts-expect-error jsdom polyfill
	globalThis.PointerEvent = class PointerEvent extends MouseEvent {
		constructor(type: string, params: PointerEventInit = {}) {
			super(type, params);
		}
	};
}

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
