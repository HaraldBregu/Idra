let state: PersistedTaskState;
const getPermissions = jest.fn();
const getTaskState = jest.fn(() => state);
const setTaskState = jest.fn((value: PersistedTaskState) => {
	state = value;
});

jest.mock('../../../../../src/main/agent/agent_store', () => ({ getPermissions }));
jest.mock('../../../../../src/main/tasks/tasks_store', () => ({ getTaskState, setTaskState }));

import { DEFAULT_PERMISSIONS } from '../../../../../src/main/agent/permissions/permissions_types';
import { getTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_get';
import { resetTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_reset';
import { saveTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_save';
import type { PersistedTaskState } from '../../../../../src/main/tasks/tasks_types';

beforeEach(() => {
	state = { schedules: [] };
	getPermissions.mockReturnValue({
		...DEFAULT_PERMISSIONS,
		read: { default: 'deny', allow: [], deny: [], ask: [] },
	});
});

it('copies the main policy once and then keeps the task policy independent', () => {
	expect(getTaskPermissions().read).toMatchObject({ default: 'deny' });
	expect(setTaskState).toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.any(Object) }));
	getPermissions.mockReturnValue(DEFAULT_PERMISSIONS);
	expect(getTaskPermissions().read).toMatchObject({ default: 'deny' });
});

it('saves and resets permissions without replacing schedules or runtime settings', () => {
	state = {
		providerId: 'openai',
		modelId: 'model',
		schedules: [
			{
				id: 'schedule-1',
				name: 'Daily',
				enabled: true,
				action: { type: 'debug', message: 'test' },
				createdAt: 'now',
				updatedAt: 'now',
			},
		],
	};
	saveTaskPermissions({
		...DEFAULT_PERMISSIONS,
		write: { default: 'allow', allow: [], deny: [], ask: [] },
	});
	expect(state).toMatchObject({
		providerId: 'openai',
		modelId: 'model',
		schedules: [expect.objectContaining({ id: 'schedule-1' })],
		permissions: { write: expect.objectContaining({ default: 'allow' }) },
	});

	resetTaskPermissions();
	expect(state.schedules).toHaveLength(1);
	expect(state.permissions?.write).toMatchObject({ default: 'ask' });
});
