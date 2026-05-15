import { cn } from '../../../../src/renderer/src/lib/utils';

describe('renderer utils', () => {
	it('merges Tailwind classes with later conflicts winning', () => {
		const shouldHide = Boolean('');

		expect(cn('px-2 text-sm', shouldHide && 'hidden', 'px-4')).toBe('text-sm px-4');
	});
});
