import { ExtensionRegistry } from '../../../../src/main/extensions/extension_registry';

describe('extension registry', () => {
	function webContents(id: number) {
		const handlers = new Map<string, () => void>();
		return {
			handlers,
			value: {
				id,
				once: jest.fn((event: string, handler: () => void) => handlers.set(event, handler)),
			},
		};
	}

	it('resolves registered extension views and removes crashed views', () => {
		const registry = new ExtensionRegistry();
		const contents = webContents(7);
		registry.register(contents.value as never, 'draw');

		expect(registry.resolve(contents.value)).toBe('draw');
		contents.handlers.get('render-process-gone')?.();
		expect(() => registry.resolve(contents.value)).toThrow('registered extension views');
	});

	it('rejects invalid or conflicting registrations', () => {
		const registry = new ExtensionRegistry();
		const invalid = webContents(0);
		const contents = webContents(7);
		const conflicting = webContents(7);
		expect(() => registry.register(invalid.value as never, 'draw')).toThrow('web contents ID');
		expect(() => registry.register(contents.value as never, '../draw')).toThrow(
			'Invalid extension ID'
		);

		registry.register(contents.value as never, 'draw');
		expect(() => registry.register(conflicting.value as never, 'demo')).toThrow(
			'already registered'
		);
		expect(() => registry.resolve(conflicting.value)).toThrow('registered extension views');
		expect(registry.resolve(contents.value)).toBe('draw');
	});
});
