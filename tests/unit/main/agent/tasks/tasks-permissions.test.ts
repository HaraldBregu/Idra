let state: PersistedTaskState;
const getTaskState = jest.fn(() => state);
const setTaskState = jest.fn((value: PersistedTaskState) => {
	state = value;
});

jest.mock('../../../../../src/main/tasks/tasks_store', () => ({ getTaskState, setTaskState }));

import {
	DEFAULT_PERMISSIONS,
	PERMISSION_TOOLS,
} from '../../../../../src/main/agent/permissions/permissions_types';
import { getTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_get';
import { resetTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_reset';
import { saveTaskPermissions } from '../../../../../src/main/tasks/tasks_permissions_save';
import type { PersistedTaskState } from '../../../../../src/main/tasks/tasks_types';

beforeEach(() => {
	state = { schedules: [] };
});

it('initializes every background-task tool as allowed', () => {
	const permissions = getTaskPermissions();
	for (const toolName of PERMISSION_TOOLS) {
		expect(permissions[toolName]).toMatchObject({ default: 'allow' });
	}
	expect(setTaskState).toHaveBeenCalledWith(expect.objectContaining({ permissions: expect.any(Object) }));
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
	for (const toolName of PERMISSION_TOOLS) {
		expect(state.permissions?.[toolName]).toMatchObject({ default: 'allow' });
	}
});
