import os from 'node:os';
import path from 'node:path';

import { userDataLocation } from '../../../../src/main/shared/user_data_location';

describe('userDataLocation', () => {
	it('keeps persistent Friday data in the user profile', () => {
		expect(userDataLocation()).toBe(path.join(os.homedir(), '.friday'));
	});
});
