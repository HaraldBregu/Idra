import { ExtensionRegistry } from '../../../../src/main/extensions/extension_registry';

describe('extension registry', () => {
	it('resolves registered extension views and removes destroyed views', () => {
		const registry = new ExtensionRegistry();
		registry.register(7, 'draw');

		expect(registry.resolve(7)).toBe('draw');
		registry.unregister(7, 'draw');
		expect(() => registry.resolve(7)).toThrow('registered extension views');
	});

	it('rejects invalid or conflicting registrations', () => {
		const registry = new ExtensionRegistry();
		expect(() => registry.register(0, 'draw')).toThrow('web contents ID');
		expect(() => registry.register(7, '../draw')).toThrow('Invalid extension ID');

		registry.register(7, 'draw');
		expect(() => registry.register(7, 'demo')).toThrow('already registered');
		registry.unregister(7, 'demo');
		expect(registry.resolve(7)).toBe('draw');
	});
});
