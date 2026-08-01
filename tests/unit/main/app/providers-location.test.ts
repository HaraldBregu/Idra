import path from 'node:path';
import { providersDir } from '../../../../src/main/app/models';
import { userDataLocation } from '../../../../src/main/shared/user_data_location';

describe('providersDir', () => {
	it('stores uploaded providers in Friday user data', () => {
		expect(providersDir()).toBe(path.join(userDataLocation(), 'providers'));
	});
});
