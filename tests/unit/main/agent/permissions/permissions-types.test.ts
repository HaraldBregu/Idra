import { EMPTY_PERMISSIONS } from '../../../../../src/main/agent/permissions/permissions_types';

describe('EMPTY_PERMISSIONS', () => {
	it('contains independent read, write, and execute path rules', () => {
		expect(EMPTY_PERMISSIONS).toEqual({
			read: { allow: [], deny: [] },
			write: { allow: [], deny: [] },
			exec: { allow: [], deny: [] },
		});
	});
});
