import { optionalStringList } from '../../../src/preload/normalize';

it('preserves an explicit empty string list', () => {
	expect(optionalStringList([])).toEqual([]);
	expect(optionalStringList([' read ', '', 'write'])).toEqual(['read', 'write']);
	expect(optionalStringList(undefined)).toBeUndefined();
});
